import Link from "next/link";
import styles from "./offline.module.css";

export default function OfflinePage() {
  return (
    <main className={styles.page}>
      <img src="/pwa-192.png" alt="Look&Go" />
      <span>MODE HORS CONNEXION</span>
      <h1>Votre dressing reste avec vous.</h1>
      <p>La connexion internet est momentanément indisponible. Les écrans déjà ouverts peuvent rester accessibles, mais les générations IA, le shopping et la synchronisation nécessitent une connexion.</p>
      <div>
        <Link href="/profil">Retour à mon espace</Link>
        <Link href="/">Accueil Look&Go</Link>
      </div>
    </main>
  );
}
