"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./PwaInstallPrompt.module.css";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

declare global {
  interface Navigator { standalone?: boolean }
}

const DISMISS_KEY = "lookgo:pwa-install-dismissed";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

export default function PwaInstallPrompt() {
  const pathname = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const [isIos, setIsIos] = useState(false);

  const eligiblePath = useMemo(() => pathname === "/profil" || pathname === "/dressing" || pathname === "/mariage", [pathname]);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    if (standalone || !eligiblePath) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_MS) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIos(ios);
    if (ios) setVisible(true);

    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const installed = () => {
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, [eligiblePath]);

  if (!visible || !eligiblePath) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (isIos && !deferred) {
      setIosHelp(true);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
    setDeferred(null);
  };

  return (
    <aside className={styles.prompt} aria-label="Installer Look&Go">
      <button className={styles.close} type="button" onClick={dismiss} aria-label="Fermer">×</button>
      <img src="/pwa-192.png" alt="" aria-hidden="true" />
      <div className={styles.copy}>
        <span>LOOK&GO SUR VOTRE TÉLÉPHONE</span>
        <strong>Installez votre dressing privé.</strong>
        <p>{iosHelp ? "Sur iPhone/iPad : touchez Partager, puis « Sur l’écran d’accueil »." : "Accédez à vos looks, votre dressing et votre Pack Mariage comme à une vraie application."}</p>
      </div>
      <button className={styles.install} type="button" onClick={install}>{isIos && !deferred ? "Comment installer" : "Installer"}</button>
    </aside>
  );
}
