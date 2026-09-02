"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import ProfileDashboard from "@/components/ProfileDashboard";
import { type BetaProfile, clearBetaProfile, readBetaProfile, saveBetaProfile } from "@/lib/beta-profile";
import { clearBetaMedia } from "@/lib/beta-media";
import {
  betaAuthStatus,
  createOrUpdateBetaAccessCode,
  readBetaProfileCloud,
  saveBetaProfileCloud,
  signOutBetaCloud,
} from "@/lib/firebase-beta";
import pageStyles from "./ProfilePage.module.css";
import "./profil.css";

function trace(event: string, data: Record<string, unknown> = {}) {
  try {
    void fetch("/api/client-telemetry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, ...data }),
    });
  } catch {}
}

export default function ProfilPage() {
  const [profile, setProfile] = useState<BetaProfile | null>(null);
  const [codeEnabled, setCodeEnabled] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeMessage, setCodeMessage] = useState("");
  const [codeError, setCodeError] = useState("");
  const [savingCode, setSavingCode] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const local = readBetaProfile();
      let cloud: BetaProfile | null = null;
      try {
        cloud = await readBetaProfileCloud();
      } catch {}
      const merged = { ...(cloud || {}), ...local };
      if (!alive) return;
      saveBetaProfile(merged);
      setProfile(merged);

      const auth = await betaAuthStatus();
      if (!alive) return;
      setCodeEnabled(auth.accessCodeEnabled);
      if (auth.accessCodeEnabled) {
        saveBetaProfile({ codeConfigured: true });
        setProfile((current) => (current ? { ...current, codeConfigured: true } : current));
      }
      trace("profile_dashboard_opened", {
        durable: auth.durable,
        accessCodeEnabled: auth.accessCodeEnabled,
      });
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!showCodeModal) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !savingCode) setShowCodeModal(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [showCodeModal, savingCode]);

  async function leave() {
    trace("profile_signout_clicked", { accessCodeEnabled: codeEnabled });
    await signOutBetaCloud();
    await clearBetaMedia();
    clearBetaProfile();
    location.href = "/connexion";
  }

  function openCodeModal() {
    setCodeError("");
    setCodeMessage("");
    setShowCodeModal(true);
    trace("profile_code_modal_opened", { accessCodeEnabled: codeEnabled });
  }

  async function saveCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile?.email) return;
    setCodeMessage("");
    setCodeError("");
    setSavingCode(true);

    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") || "");
    const confirm = String(form.get("confirmCode") || "");
    if (!/^\d{6}$/.test(code)) {
      setCodeError("Le code doit contenir exactement 6 chiffres.");
      setSavingCode(false);
      return;
    }
    if (code !== confirm) {
      setCodeError("Les deux codes ne correspondent pas.");
      setSavingCode(false);
      return;
    }

    const result = await createOrUpdateBetaAccessCode(profile.email, code);
    if (!result.ok) {
      setCodeError(result.error || "Impossible d’enregistrer le code.");
      setSavingCode(false);
      return;
    }

    const next = { ...profile, codeConfigured: true };
    setProfile(next);
    saveBetaProfile({ codeConfigured: true });
    await saveBetaProfileCloud(next);
    setCodeEnabled(true);
    setCodeMessage("✓ Code enregistré. Votre espace peut maintenant être retrouvé avec votre email sur un autre appareil.");
    event.currentTarget.reset();
    setSavingCode(false);
    trace("profile_code_submit_success");
  }

  if (profile === null) {
    return <main className={`account-page ${pageStyles.page}`} />;
  }

  if (!profile.email && !profile.pseudo) {
    return (
      <main className={`account-page ${pageStyles.page}`}>
        <section className={pageStyles.shell}>
          <div className="profile-status">
            <div>
              <span>MODE BÊTA</span>
              <h2>Aucun profil connecté.</h2>
              <p>Créez votre profil ou retrouvez votre espace avec votre email et votre code personnel.</p>
            </div>
            <Link href="/connexion">Connexion →</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`account-page ${pageStyles.page}`}>
      <header className="account-header">
        <Link href="/" className="account-logo">LOOK&GO</Link>
        <div>
          <span>{profile.email}</span>
          <button onClick={leave}>Se déconnecter</button>
        </div>
      </header>

      <section className={pageStyles.shell}>
        {!codeEnabled && (
          <aside className={pageStyles.accessBanner} aria-label="Sécuriser mon espace">
            <div>
              <span>ESPACE BÊTA</span>
              <strong>Sécurisez votre dressing privé.</strong>
              <p>Créez votre code personnel à 6 chiffres pour retrouver votre profil, vos photos et vos looks sur un autre appareil.</p>
            </div>
            <button type="button" onClick={openCodeModal}>Créer mon code →</button>
          </aside>
        )}

        <ProfileDashboard />
      </section>

      {showCodeModal && (
        <div className="code-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !savingCode) setShowCodeModal(false);
        }}>
          <section className={`code-modal${codeMessage ? " code-success" : ""}`} role="dialog" aria-modal="true" aria-labelledby="profile-code-title">
            <button className="code-modal-close" type="button" disabled={savingCode} onClick={() => setShowCodeModal(false)} aria-label="Fermer">×</button>
            <span>MON ACCÈS LOOK&GO</span>
            <h2 id="profile-code-title">{codeEnabled ? "Modifier mon code personnel" : "Créer mon code personnel"}</h2>
            <p>Votre code reste secret et n’est jamais affiché dans votre profil. Il sert uniquement à retrouver votre espace avec <strong>{profile.email}</strong>.</p>
            <form className="access-code-form" onSubmit={saveCode}>
              <label>Nouveau code à 6 chiffres<input name="code" type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="new-password" required placeholder="••••••" /></label>
              <label>Confirmer le code<input name="confirmCode" type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="new-password" required placeholder="••••••" /></label>
              {codeError && <p className="profile-required">{codeError}</p>}
              {codeMessage && <p className="profile-required">{codeMessage}</p>}
              <button className="reference-photo-button" type="submit" disabled={savingCode}>{savingCode ? "Enregistrement…" : "Enregistrer mon code"}</button>
              {codeMessage && <button className="code-modal-done" type="button" onClick={() => setShowCodeModal(false)}>Terminer</button>}
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
