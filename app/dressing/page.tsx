"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { readBetaProfile, type BetaProfile } from "@/lib/beta-profile";
import { readBetaProfileCloud } from "@/lib/firebase-beta";
import {
  deleteWardrobeItem,
  readWardrobeItems,
  saveWardrobeDetections,
  uploadWardrobePhoto,
  wardrobeAuthToken,
} from "@/lib/firebase-wardrobe";
import {
  WARDROBE_CATEGORIES,
  WARDROBE_CATEGORY_LABELS,
  wardrobeDuplicateScore,
  type WardrobeCategory,
  type WardrobeDetection,
  type WardrobeItem,
} from "@/lib/wardrobe";
import "./dressing.css";

type ScanPhoto = {
  id: string;
  blob: Blob;
  name: string;
  url: string;
};

type ScanResponse = {
  items?: WardrobeDetection[];
  summary?: { detectedCount?: number; notes?: string };
  error?: string;
};

const MAX_PHOTOS = 3;
const MAX_SCAN_BYTES = 1_150_000;

async function blobImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Photo illisible"));
      image.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

async function compressWardrobePhoto(file: File): Promise<Blob> {
  try {
    let source: CanvasImageSource;
    let width: number;
    let height: number;
    let close: (() => void) | undefined;
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      source = bitmap;
      width = bitmap.width;
      height = bitmap.height;
      close = () => bitmap.close();
    } else {
      const image = await blobImage(file);
      source = image;
      width = image.naturalWidth;
      height = image.naturalHeight;
    }
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const outWidth = Math.max(1, Math.round(width * scale));
    const outHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Compression indisponible");
    ctx.drawImage(source, 0, 0, outWidth, outHeight);
    close?.();
    let quality = 0.84;
    let output = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Compression impossible"))), "image/jpeg", quality),
    );
    while (output.size > MAX_SCAN_BYTES && quality > 0.48) {
      quality -= 0.08;
      output = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Compression impossible"))), "image/jpeg", quality),
      );
    }
    if (output.size > 1_300_000) throw new Error("Photo trop volumineuse");
    return output;
  } catch (error) {
    if (file.size <= 1_300_000 && file.type.startsWith("image/")) return file;
    throw error;
  }
}

function bestDuplicate(item: WardrobeDetection, wardrobe: WardrobeItem[]) {
  let match: WardrobeItem | null = null;
  let score = 0;
  for (const saved of wardrobe) {
    const candidate = wardrobeDuplicateScore(item, saved);
    if (candidate > score) {
      score = candidate;
      match = saved;
    }
  }
  return score >= 0.78 ? { item: match, score } : null;
}

function categoryLabel(category: WardrobeCategory) {
  return WARDROBE_CATEGORY_LABELS[category] || "Autres";
}

export default function DressingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<BetaProfile | null>(null);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [loadingWardrobe, setLoadingWardrobe] = useState(true);
  const [photos, setPhotos] = useState<ScanPhoto[]>([]);
  const [detections, setDetections] = useState<WardrobeDetection[]>([]);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [scanNote, setScanNote] = useState("");
  const [filter, setFilter] = useState<"all" | WardrobeCategory>("all");

  useEffect(() => {
    let alive = true;
    void (async () => {
      const local = readBetaProfile();
      let cloud: BetaProfile | null = null;
      try {
        cloud = await readBetaProfileCloud();
      } catch {}
      if (!alive) return;
      const merged = { ...(cloud || {}), ...local };
      if (!merged.email && !merged.pseudo) {
        router.replace("/connexion?mode=return&returnTo=%2Fdressing");
        return;
      }
      setProfile(merged);
      const items = await readWardrobeItems();
      if (!alive) return;
      setWardrobe(items);
      setLoadingWardrobe(false);
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => () => {
    photos.forEach((photo) => URL.revokeObjectURL(photo.url));
  }, [photos]);

  const selectedDetections = useMemo(
    () => detections.filter((item) => !ignored.has(item.tempId)),
    [detections, ignored],
  );

  const filteredWardrobe = useMemo(
    () => (filter === "all" ? wardrobe : wardrobe.filter((item) => item.category === filter)),
    [filter, wardrobe],
  );

  const presentCategories = useMemo(() => new Set(wardrobe.map((item) => item.category)).size, [wardrobe]);
  const dominantColors = useMemo(() => {
    const counts = new Map<string, number>();
    wardrobe.forEach((item) => {
      const color = item.primaryColor?.trim();
      if (color) counts.set(color, (counts.get(color) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([color]) => color)
      .join(" · ") || "À découvrir";
  }, [wardrobe]);

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files || []);
    event.target.value = "";
    if (!incoming.length) return;
    setError("");
    setSuccess("");
    const slots = MAX_PHOTOS - photos.length;
    if (slots <= 0) {
      setError(`Maximum ${MAX_PHOTOS} photos par scan.`);
      return;
    }
    const chosen = incoming.slice(0, slots);
    try {
      const prepared = await Promise.all(
        chosen.map(async (file, index) => {
          const blob = await compressWardrobePhoto(file);
          return {
            id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
            blob,
            name: file.name || `penderie-${index + 1}.jpg`,
            url: URL.createObjectURL(blob),
          } satisfies ScanPhoto;
        }),
      );
      setPhotos((current) => [...current, ...prepared]);
      setDetections([]);
      setIgnored(new Set());
      if (incoming.length > slots) setError(`Seules ${MAX_PHOTOS} photos peuvent être analysées à la fois.`);
    } catch {
      setError("Une photo n’a pas pu être préparée. Utilisez de préférence une image JPG, PNG ou WebP nette.");
    }
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return current.filter((photo) => photo.id !== id);
    });
    setDetections([]);
    setIgnored(new Set());
  }

  async function analyze() {
    if (!photos.length || scanning) return;
    setScanning(true);
    setError("");
    setSuccess("");
    setScanNote("");
    try {
      const auth = await wardrobeAuthToken();
      if (!auth) throw new Error("Votre session Look&Go doit être reconnectée.");
      const form = new FormData();
      photos.forEach((photo, index) => {
        form.append(
          "images",
          new File([photo.blob], `lookgo-penderie-${index + 1}.jpg`, { type: photo.blob.type || "image/jpeg" }),
        );
      });
      const response = await fetch("/api/ai/wardrobe-scan", {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
        body: form,
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as ScanResponse;
      if (!response.ok) throw new Error(data.error || "Analyse indisponible.");
      const items = Array.isArray(data.items) ? data.items : [];
      setDetections(items);
      setIgnored(new Set());
      setScanNote(data.summary?.notes || "");
      if (!items.length) setError("Aucun vêtement suffisamment visible n’a été reconnu. Essayez une photo plus proche et mieux éclairée.");
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Impossible d’analyser ces photos.");
    } finally {
      setScanning(false);
    }
  }

  function patchDetection(tempId: string, patch: Partial<WardrobeDetection>) {
    setDetections((current) => current.map((item) => (item.tempId === tempId ? { ...item, ...patch } : item)));
  }

  function toggleDetection(tempId: string) {
    setIgnored((current) => {
      const next = new Set(current);
      if (next.has(tempId)) next.delete(tempId);
      else next.add(tempId);
      return next;
    });
  }

  async function saveValidated() {
    if (!selectedDetections.length || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const scanId = `scan-${Date.now().toString(36)}`;
      const uploaded = await Promise.all(
        photos.map((photo, index) => uploadWardrobePhoto(photo.blob, scanId, index, photo.name)),
      );
      const paths: Record<number, string> = {};
      uploaded.forEach((path, index) => {
        if (path) paths[index] = path;
      });
      const saved = await saveWardrobeDetections(selectedDetections, paths);
      if (!saved) throw new Error("Le dressing n’a pas pu être sauvegardé. Réessayez.");
      const refreshed = await readWardrobeItems();
      setWardrobe(refreshed);
      setSuccess(`${saved} pièce${saved > 1 ? "s" : ""} ajoutée${saved > 1 ? "s" : ""} à votre dressing.`);
      photos.forEach((photo) => URL.revokeObjectURL(photo.url));
      setPhotos([]);
      setDetections([]);
      setIgnored(new Set());
      setScanNote("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Sauvegarde impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function removeWardrobeItem(id: string) {
    if (!confirm("Retirer cette pièce de votre dressing ?")) return;
    if (await deleteWardrobeItem(id)) setWardrobe((current) => current.filter((item) => item.id !== id));
    else setError("Cette pièce n’a pas pu être supprimée.");
  }

  if (profile === null) {
    return <main className="wardrobe-page"><div className="wardrobe-main">Ouverture de votre dressing…</div></main>;
  }

  return (
    <main className="wardrobe-page">
      <header className="wardrobe-header">
        <Link href="/" className="wardrobe-logo">LOOK&GO</Link>
        <nav>
          <Link href="/inscription/analyse">Mes looks</Link>
          <Link className="wardrobe-profile-link" href="/profil">Mon profil</Link>
        </nav>
      </header>

      <div className="wardrobe-main">
        <section className="wardrobe-hero">
          <div className="wardrobe-hero-copy">
            <span className="wardrobe-overline">MON DRESSING PRIVÉ IA</span>
            <h1>Votre penderie,<br/><em>comprise par l’IA.</em></h1>
            <p>Photographiez votre penderie. Look&Go reconnaît les pièces visibles, propose leur catégorie, leur couleur et leur style. Rien n’est enregistré avant votre validation.</p>
          </div>
          <div className="wardrobe-stats">
            <article className="wardrobe-stat"><strong>{loadingWardrobe ? "—" : wardrobe.length}</strong><span>pièces enregistrées</span></article>
            <article className="wardrobe-stat"><strong>{loadingWardrobe ? "—" : presentCategories}</strong><span>catégories actives</span></article>
            <article className="wardrobe-stat wide"><strong>{dominantColors}</strong><span>couleurs dominantes</span></article>
          </div>
        </section>

        <section className="wardrobe-panel" id="scanner">
          <div className="wardrobe-panel-head">
            <div>
              <span className="wardrobe-overline">SCAN DRESSING IA</span>
              <h2>Photographier ma penderie</h2>
              <p>Ajoutez jusqu’à 3 angles. Pour de meilleurs résultats, évitez les vêtements trop tassés et privilégiez une bonne lumière.</p>
            </div>
            <span className="wardrobe-security">✓ Validation obligatoire avant sauvegarde</span>
          </div>

          <div className="wardrobe-upload-grid">
            {photos.map((photo, index) => (
              <article className="wardrobe-upload-card" key={photo.id}>
                <img src={photo.url} alt={`Penderie ${index + 1}`}/>
                <button type="button" aria-label={`Retirer la photo ${index + 1}`} onClick={() => removePhoto(photo.id)}>×</button>
              </article>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="wardrobe-add-photo">
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple capture="environment" onChange={addPhotos}/>
                <span><strong>+ Ajouter une photo</strong>Face à la penderie, puis un autre angle si nécessaire.<br/>{photos.length}/{MAX_PHOTOS} photo{photos.length > 1 ? "s" : ""}</span>
              </label>
            )}
          </div>

          <div className="wardrobe-actions">
            <button className="wardrobe-primary" type="button" disabled={!photos.length || scanning || saving} onClick={analyze}>
              {scanning ? "Analyse de la penderie…" : "Analyser avec Look&Go Vision →"}
            </button>
            {photos.length > 0 && <button className="wardrobe-secondary" type="button" onClick={() => { photos.forEach((photo) => URL.revokeObjectURL(photo.url)); setPhotos([]); setDetections([]); setIgnored(new Set()); setError(""); }}>Recommencer</button>}
          </div>

          {scanning && <div className="wardrobe-progress"><strong>L’IA observe les pièces visibles…</strong><span>Type de vêtement · catégorie · couleur · motif · style · matière probable · saison · occasion</span></div>}
          {error && <div className="wardrobe-error">{error}</div>}
          {success && <div className="wardrobe-success">{success}</div>}

          {detections.length > 0 && (
            <>
              <div className="wardrobe-panel-head" style={{ marginTop: 34 }}>
                <div>
                  <span className="wardrobe-overline">VÉRIFICATION</span>
                  <h2>{detections.length} pièce{detections.length > 1 ? "s" : ""} détectée{detections.length > 1 ? "s" : ""}</h2>
                  <p>{scanNote || "Corrigez si nécessaire, puis gardez uniquement les pièces que vous souhaitez ajouter."}</p>
                </div>
              </div>
              <div className="wardrobe-detections">
                {detections.map((item) => {
                  const duplicate = bestDuplicate(item, wardrobe);
                  const isIgnored = ignored.has(item.tempId);
                  return (
                    <article className={`wardrobe-detection ${isIgnored ? "ignored" : ""}`} key={item.tempId}>
                      <div className="wardrobe-detection-index"><strong>{item.sourceImageIndex + 1}</strong><span>PHOTO SOURCE</span></div>
                      <div className="wardrobe-detection-fields">
                        <label>Catégorie
                          <select value={item.category} onChange={(event) => patchDetection(item.tempId, { category: event.target.value as WardrobeCategory, categoryLabel: categoryLabel(event.target.value as WardrobeCategory) })}>
                            {WARDROBE_CATEGORIES.map((category) => <option value={category} key={category}>{categoryLabel(category)}</option>)}
                          </select>
                        </label>
                        <label>Type
                          <input value={item.garmentType} onChange={(event) => patchDetection(item.tempId, { garmentType: event.target.value, subcategory: event.target.value })}/>
                        </label>
                        <label>Couleur principale
                          <input value={item.primaryColor} onChange={(event) => patchDetection(item.tempId, { primaryColor: event.target.value })}/>
                        </label>
                        <label>Motif
                          <input value={item.pattern} onChange={(event) => patchDetection(item.tempId, { pattern: event.target.value })}/>
                        </label>
                        <label className="span-2">Styles
                          <input value={item.styles.join(", ")} onChange={(event) => patchDetection(item.tempId, { styles: event.target.value.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 5) })}/>
                        </label>
                      </div>
                      <div className="wardrobe-detection-meta">
                        <span className="wardrobe-pill">IA {Math.round(item.confidence * 100)}%</span>
                        {duplicate && <span className="wardrobe-pill duplicate">Doublon possible · {Math.round(duplicate.score * 100)}%</span>}
                        <button className="wardrobe-toggle" type="button" onClick={() => toggleDetection(item.tempId)}>{isIgnored ? "↩ Garder" : "Ignorer"}</button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="wardrobe-savebar">
                <div><strong>{selectedDetections.length} pièce{selectedDetections.length > 1 ? "s" : ""} à ajouter</strong><div>Les pièces ignorées ne seront pas enregistrées.</div></div>
                <button className="wardrobe-primary" type="button" disabled={!selectedDetections.length || saving} onClick={saveValidated}>{saving ? "Sauvegarde…" : "Ajouter à mon dressing →"}</button>
              </div>
            </>
          )}
        </section>

        <section className="wardrobe-panel">
          <div className="wardrobe-panel-head">
            <div>
              <span className="wardrobe-overline">DRESSING ENREGISTRÉ</span>
              <h2>Mes pièces</h2>
              <p>Votre dressing devient la base des futurs looks, du Try-On et des recommandations d’achat Look&Go.</p>
            </div>
          </div>
          <div className="wardrobe-filters">
            <button className={`wardrobe-filter ${filter === "all" ? "active" : ""}`} type="button" onClick={() => setFilter("all")}>Tout · {wardrobe.length}</button>
            {WARDROBE_CATEGORIES.map((category) => {
              const count = wardrobe.filter((item) => item.category === category).length;
              if (!count) return null;
              return <button className={`wardrobe-filter ${filter === category ? "active" : ""}`} type="button" onClick={() => setFilter(category)} key={category}>{categoryLabel(category)} · {count}</button>;
            })}
          </div>
          {loadingWardrobe ? <div className="wardrobe-empty">Chargement de votre dressing…</div> : filteredWardrobe.length === 0 ? (
            <div className="wardrobe-empty"><strong>Votre dressing numérique commence ici.</strong>Ajoutez une photo de votre penderie pour créer vos premières pièces.</div>
          ) : (
            <div className="wardrobe-grid">
              {filteredWardrobe.map((item) => (
                <article className="wardrobe-item" key={item.id}>
                  <div className="wardrobe-item-visual"><strong>{item.garmentType || item.subcategory}</strong><span>{item.primaryColor}{item.pattern ? ` · ${item.pattern}` : ""}</span></div>
                  <div className="wardrobe-item-copy">
                    <small>{categoryLabel(item.category)}</small>
                    <h3>{item.subcategory || item.garmentType}</h3>
                    <p>{item.styles?.length ? item.styles.join(" · ") : "Style à enrichir avec vos prochains looks"}</p>
                    <div className="wardrobe-item-footer"><span>{item.aiGenerated ? "Reconnu par IA · validé" : "Ajout manuel"}</span><button className="wardrobe-delete" type="button" onClick={() => void removeWardrobeItem(item.id)}>Retirer</button></div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
