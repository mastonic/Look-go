import { NextResponse } from "next/server";
import {
  WARDROBE_CATEGORIES,
  WARDROBE_CATEGORY_LABELS,
  canonicalColorFamily,
  dedupeWardrobeDetections,
  type WardrobeDetection,
} from "@/lib/wardrobe";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 1_300_000;
const MAX_ITEMS = 40;
const OPENAI_TIMEOUT_MS = 50_000;

function bearerToken(request: Request) {
  return (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

async function verifyFirebaseUser(token: string) {
  const apiKey = String(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
  if (!apiKey || !token) return null;
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken: token }),
        cache: "no-store",
      },
    );
    const data = (await response.json().catch(() => ({}))) as { users?: Array<{ localId?: string }> };
    return response.ok ? data.users?.[0]?.localId || null : null;
  } catch {
    return null;
  }
}

async function fileDataUrl(file: File) {
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  return `data:${file.type || "image/jpeg"};base64,${base64}`;
}

function extractOutputText(data: unknown) {
  if (!data || typeof data !== "object") return "";
  const root = data as Record<string, unknown>;
  if (typeof root.output_text === "string") return root.output_text;
  const output = Array.isArray(root.output) ? root.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as unknown[])
      : [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const value = part as Record<string, unknown>;
      if (value.type === "output_text" && typeof value.text === "string") return value.text;
    }
  }
  return "";
}

function cleanString(value: unknown, max = 120) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanList(value: unknown, maxItems = 6) {
  return Array.isArray(value)
    ? value.map((entry) => cleanString(entry, 60)).filter(Boolean).slice(0, maxItems)
    : [];
}

function normalizeDetection(raw: Record<string, unknown>, index: number): WardrobeDetection {
  const category = WARDROBE_CATEGORIES.includes(raw.category as (typeof WARDROBE_CATEGORIES)[number])
    ? (raw.category as WardrobeDetection["category"])
    : "other";
  const box = raw.bbox && typeof raw.bbox === "object" ? (raw.bbox as Record<string, unknown>) : {};
  const clampBox = (value: unknown) => Math.max(0, Math.min(1000, Math.round(Number(value) || 0)));
  const primaryColor = cleanString(raw.primary_color, 60) || "Non précisée";
  const modelColorFamily = cleanString(raw.color_family, 40);
  return {
    tempId: cleanString(raw.temp_id, 48) || `item_${String(index + 1).padStart(2, "0")}`,
    sourceImageIndex: Math.max(0, Math.min(MAX_IMAGES - 1, Math.round(Number(raw.source_image_index) || 0))),
    category,
    categoryLabel: WARDROBE_CATEGORY_LABELS[category],
    subcategory: cleanString(raw.subcategory, 80) || "Non précisé",
    garmentType: cleanString(raw.garment_type, 80) || cleanString(raw.subcategory, 80) || "Vêtement",
    primaryColor,
    colorFamily: canonicalColorFamily(modelColorFamily || primaryColor),
    secondaryColors: cleanList(raw.secondary_colors, 4),
    pattern: cleanString(raw.pattern, 60) || "uni",
    styles: cleanList(raw.styles, 6),
    materialGuess: cleanString(raw.material_guess, 80),
    seasons: cleanList(raw.seasons, 4),
    occasions: cleanList(raw.occasions, 6),
    visualSignature: cleanString(raw.visual_signature, 220),
    bbox: {
      x: clampBox(box.x),
      y: clampBox(box.y),
      width: clampBox(box.width),
      height: clampBox(box.height),
    },
    confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0)),
    notes: cleanString(raw.notes, 220),
  };
}

async function analyzeWithOpenAI(images: File[]) {
  const key = String(process.env.OPENAI_API_KEY || "").trim();
  if (!key) throw new Error("OPENAI_NOT_CONFIGURED");
  const model = String(process.env.OPENAI_WARDROBE_MODEL || "gpt-5.6-terra").trim();
  const imageUrls = await Promise.all(images.map(fileDataUrl));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const content: Array<Record<string, unknown>> = [
      {
        type: "input_text",
        text: [
          "Tu es Look&Go Vision, spécialiste de reconnaissance de vêtements réels dans une penderie.",
          "Objectif prioritaire: inventaire fidèle, couleurs justes, type de vêtement précis, bonne catégorie et zéro doublon artificiel.",
          "Détecte TOUT type d'habillement ou accessoire réellement visible: hauts, chemises, t-shirts, polos, débardeurs, corsets, pulls, cardigans, gilets, sweats, pantalons, jeans, leggings, shorts, jupes, robes, combinaisons, ensembles, costumes, tailleurs, blazers, vestes, manteaux, parkas, trenchs, doudounes, vêtements de sport, maillots de bain, lingerie, sous-vêtements, vêtements de nuit/homewear, chaussures, bottes, baskets, sandales, sacs, chapeaux, casquettes, foulards, ceintures, cravates, bijoux, collants, chaussettes et autres pièces portables.",
          "N'invente jamais une pièce cachée. Si un vêtement est trop masqué, baisse confidence au lieu de deviner.",
          "Ne confonds pas les objets voisins avec des vêtements: cintres, portes, meubles, draps, rideaux, serviettes et emballages ne sont pas des pièces du dressing sauf s'ils sont clairement portables.",
          "DOUBLONS: si la même pièce apparaît sur plusieurs photos/angles, retourne-la UNE SEULE FOIS, sur la photo où elle est la plus lisible. En revanche, deux vêtements distincts très similaires visibles côte à côte sur la même photo doivent rester deux pièces distinctes.",
          "COULEURS: primary_color doit être la teinte visuelle la plus précise en français (ex: bleu marine, écru, bordeaux, kaki olive, rose poudré). color_family doit être une famille simple parmi noir|blanc|gris|beige|marron|bleu|vert|rouge|rose|violet|orange|jaune|dore|argente|multicolore. Ignore les petites ombres et reflets dus à l'éclairage.",
          "STYLE: renseigne uniquement des styles réellement soutenus par la coupe, la matière et les détails visibles. Exemples: classique, chic, casual, minimaliste, business, streetwear, sportswear, bohème, romantique, preppy, glamour, vintage, rock, workwear, techwear, luxe, avant-garde. 1 à 4 styles suffisent généralement.",
          "CATÉGORIE: utilise exclusivement la taxonomie fournie. garment_type et subcategory doivent rester précis en français. Exemples: category tops + garment_type chemise; outerwear + blazer; knitwear + cardigan; bottoms + jean droit; shoes + mocassins; headwear + bob; jewelry + collier.",
          "MATIÈRE: ne l'affirme que si elle est visuellement crédible; sinon chaîne vide. Ne jamais inventer une marque.",
          "visual_signature doit combiner les signes distinctifs utiles au rapprochement entre angles: type exact, couleur, motif, coupe, texture, boutons, poches, col, manches, longueur, détails métalliques, imprimé. N'utilise pas de position du cintre comme caractéristique.",
          "bbox utilise des coordonnées normalisées 0-1000 sur la photo source: x, y, width, height et doit encadrer la pièce, pas tout le meuble.",
          `Maximum ${MAX_ITEMS} pièces distinctes sur ce scan. Privilégie la précision à la quantité lorsque la penderie est très dense.`,
        ].join(" "),
      },
      ...imageUrls.map((image_url) => ({ type: "input_image", image_url, detail: "high" })),
    ];

    const schema = {
      type: "object",
      additionalProperties: false,
      required: ["summary", "items"],
      properties: {
        summary: {
          type: "object",
          additionalProperties: false,
          required: ["detected_count", "image_count", "notes"],
          properties: {
            detected_count: { type: "integer", minimum: 0, maximum: MAX_ITEMS },
            image_count: { type: "integer", minimum: 1, maximum: MAX_IMAGES },
            notes: { type: "string" },
          },
        },
        items: {
          type: "array",
          maxItems: MAX_ITEMS,
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "temp_id",
              "source_image_index",
              "category",
              "category_label",
              "subcategory",
              "garment_type",
              "primary_color",
              "color_family",
              "secondary_colors",
              "pattern",
              "styles",
              "material_guess",
              "seasons",
              "occasions",
              "visual_signature",
              "bbox",
              "confidence",
              "notes",
            ],
            properties: {
              temp_id: { type: "string" },
              source_image_index: { type: "integer", minimum: 0, maximum: MAX_IMAGES - 1 },
              category: { type: "string", enum: WARDROBE_CATEGORIES },
              category_label: { type: "string" },
              subcategory: { type: "string" },
              garment_type: { type: "string" },
              primary_color: { type: "string" },
              color_family: { type: "string", enum: ["noir", "blanc", "gris", "beige", "marron", "bleu", "vert", "rouge", "rose", "violet", "orange", "jaune", "dore", "argente", "multicolore"] },
              secondary_colors: { type: "array", maxItems: 4, items: { type: "string" } },
              pattern: { type: "string" },
              styles: { type: "array", maxItems: 6, items: { type: "string" } },
              material_guess: { type: "string" },
              seasons: { type: "array", maxItems: 4, items: { type: "string" } },
              occasions: { type: "array", maxItems: 6, items: { type: "string" } },
              visual_signature: { type: "string" },
              bbox: {
                type: "object",
                additionalProperties: false,
                required: ["x", "y", "width", "height"],
                properties: {
                  x: { type: "integer", minimum: 0, maximum: 1000 },
                  y: { type: "integer", minimum: 0, maximum: 1000 },
                  width: { type: "integer", minimum: 0, maximum: 1000 },
                  height: { type: "integer", minimum: 0, maximum: 1000 },
                },
              },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              notes: { type: "string" },
            },
          },
        },
      },
    };

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [{ role: "user", content }],
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "lookgo_wardrobe_scan_v2",
            strict: true,
            schema,
          },
        },
        max_output_tokens: 9000,
      }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("WARDROBE_SCAN_OPENAI_FAILED", response.status, JSON.stringify(data).slice(0, 1200));
      throw new Error(`OPENAI_HTTP_${response.status}`);
    }
    const outputText = extractOutputText(data);
    if (!outputText) throw new Error("OPENAI_EMPTY_OUTPUT");
    const parsed = JSON.parse(outputText) as { summary?: Record<string, unknown>; items?: Array<Record<string, unknown>> };
    const rawItems = Array.isArray(parsed.items) ? parsed.items.slice(0, MAX_ITEMS).map(normalizeDetection) : [];
    const items = dedupeWardrobeDetections(rawItems);
    const duplicatesRemoved = Math.max(0, rawItems.length - items.length);
    return {
      model,
      provider: "openai",
      summary: {
        detectedCount: items.length,
        rawDetectedCount: rawItems.length,
        duplicatesRemoved,
        imageCount: images.length,
        notes: cleanString(parsed.summary?.notes, 280),
      },
      items,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const started = Date.now();
  try {
    const token = bearerToken(request);
    const uid = await verifyFirebaseUser(token);
    if (!uid) return NextResponse.json({ error: "Session Look&Go invalide ou expirée." }, { status: 401 });

    const form = await request.formData();
    const images = form.getAll("images").filter((entry): entry is File => entry instanceof File);
    if (!images.length) return NextResponse.json({ error: "Ajoutez au moins une photo de votre penderie." }, { status: 400 });
    if (images.length > MAX_IMAGES) return NextResponse.json({ error: `Maximum ${MAX_IMAGES} photos par scan.` }, { status: 400 });
    for (const image of images) {
      if (!image.type.startsWith("image/")) return NextResponse.json({ error: "Tous les fichiers doivent être des images." }, { status: 400 });
      if (image.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "Une photo est encore trop volumineuse après compression." }, { status: 413 });
    }

    const result = await analyzeWithOpenAI(images);
    console.info("WARDROBE_SCAN_SUCCESS", JSON.stringify({ uid, count: result.items.length, duplicatesRemoved: result.summary.duplicatesRemoved, model: result.model, durationMs: Date.now() - started }));
    return NextResponse.json({ ...result, durationMs: Date.now() - started });
  } catch (error) {
    const code = error instanceof Error ? (error.name === "AbortError" ? "OPENAI_TIMEOUT" : error.message) : "WARDROBE_SCAN_ERROR";
    console.error("WARDROBE_SCAN_FAILED", code);
    if (code === "OPENAI_NOT_CONFIGURED") return NextResponse.json({ error: "Le moteur de reconnaissance du dressing n’est pas configuré." }, { status: 503 });
    if (code === "OPENAI_TIMEOUT") return NextResponse.json({ error: "L’analyse a pris trop de temps. Réessayez avec moins de photos." }, { status: 504 });
    return NextResponse.json({ error: "Impossible d’analyser le dressing pour le moment. Réessayez." }, { status: 502 });
  }
}
