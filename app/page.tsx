import Image from "next/image";
import Link from "next/link";
import { TryOnDemo } from "@/components/TryOnDemo";
import "./v31.css";

const editorialImages = {
  vibrantWoman: "https://images.unsplash.com/photo-1776790376541-233f911d90b4?auto=format&fit=crop&w=1600&q=88",
  jewelryWoman: "https://images.unsplash.com/photo-1767249629217-536a5ef26cc2?auto=format&fit=crop&w=1600&q=88",
  blueSuitMan: "https://images.unsplash.com/photo-1754485115876-9221149ccc19?auto=format&fit=crop&w=1600&q=88",
  wardrobe: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1600&q=86",
};

const steps = [
  ["01", "Votre profil privé", "Votre silhouette, vos couleurs, vos envies et votre budget deviennent le point de départ."],
  ["02", "Votre sélection", "Des pièces choisies pour vous — pas un catalogue infini à faire défiler."],
  ["03", "Votre Try-On", "Vous visualisez le look avant de l’intégrer à votre dressing."],
  ["04", "Votre décision", "Vous gardez ce qui vous ressemble, vous laissez le reste."],
];

const useCases = [
  ["Aujourd’hui", "Un look qui donne de l’énergie à votre journée.", editorialImages.vibrantWoman, "coral"],
  ["Une occasion", "Dîner, mariage, rendez-vous ou voyage.", editorialImages.blueSuitMan, "cobalt"],
  ["Une nouvelle pièce", "Voyez immédiatement comment elle vit sur vous.", editorialImages.jewelryWoman, "mango"],
  ["Une envie", "Changez d’allure sans changer qui vous êtes.", editorialImages.wardrobe, "green"],
];

export default function HomePage() {
  return (
    <main>
      <header className="site-header">
        <Link href="#top" className="wordmark" aria-label="Look&Go, accueil">LOOK&GO</Link>
        <nav className="desktop-nav" aria-label="Navigation principale">
          <Link href="#try-on">Try-On</Link><Link href="#dressing">Dressing</Link><Link href="#styliste">Styliste</Link><Link href="#confidentialite">Privé</Link>
        </nav>
        <div className="header-actions"><Link href="#connexion" className="text-link">Connexion</Link><Link href="#commencer" className="button button-small button-dark">Créer mon dressing</Link></div>
      </header>

      <section id="top" className="hero section-shell">
        <div className="hero-copy">
          <div className="v3-pill">COLORFUL LUXURY · YOUR STYLE, YOUR ENERGY</div>
          <h1>Votre dressing.<br />Votre style.<br /><em>En couleur.</em></h1>
          <p className="hero-intro">Découvrez des vêtements qui vous ressemblent vraiment, visualisez-les sur vous et composez un dressing personnel, vivant et assumé.</p>
          <div className="cta-row"><Link href="#commencer" className="button button-coral">Créer mon dressing privé</Link><Link href="#motion" className="button button-ghost">Comprendre Look&Go</Link></div>
          <div className="color-signals"><span>STYLE</span><span>FIT</span><span>COULEURS</span><span>OCCASION</span></div>
        </div>
        <div className="hero-visual"><div className="hero-sun" aria-hidden="true" /><TryOnDemo /><div className="hero-sticker">100%<br/>VOUS</div></div>
      </section>

      <section className="marquee" aria-hidden="true"><div>ESSAYEZ · COMPAREZ · COMPOSEZ · OSEZ · ESSAYEZ · COMPAREZ · COMPOSEZ · OSEZ ·</div></section>

      <section id="motion" className="motion-story">
        <div className="motion-story-inner">
          <div className="motion-head">
            <div><p className="eyebrow eyebrow-light">LE CONCEPT EN MOUVEMENT</p><h2>De vous.<br/><em>À votre look.</em></h2></div>
            <div><p>Look&Go transforme quelques informations personnelles en une expérience simple : comprendre votre style, sélectionner, visualiser, puis décider.</p><div className="photo-real-note">Animation illustrative — le moteur réel sera connecté au produit final.</div></div>
          </div>
          <div className="motion-track">
            <article className="motion-card"><div className="motion-dot"/><span>01 · PROFIL</span><h3>On part de vous.</h3><p>Silhouette, taille, couleurs, style, budget et occasion.</p></article>
            <article className="motion-card"><div className="motion-dot"/><span>02 · SÉLECTION</span><h3>On réduit le bruit.</h3><p>Vous ne voyez plus tout. Vous voyez ce qui a du sens pour vous.</p></article>
            <article className="motion-card"><div className="motion-dot"/><span>03 · TRY-ON</span><h3>Vous le voyez.</h3><p>Le look est visualisé sur vous avant que vous preniez une décision.</p></article>
            <article className="motion-card"><div className="motion-dot"/><span>04 · DÉCISION</span><h3>Vous choisissez.</h3><p>Vous comparez, gardez, composez votre dressing et passez à l’action.</p></article>
          </div>
        </div>
      </section>

      <section id="try-on" className="section section-shell split-section colorful-split">
        <div className="section-kicker">TRY-ON</div>
        <div className="section-copy-large"><h2>Essayez-le.<br /><em>Avant de l’acheter.</em></h2><p>Une pièce vous plaît ? Ne l’imaginez plus seulement. Découvrez une inspiration visuelle du look, comparez et décidez avec plus de confiance.</p><Link href="#commencer" className="button button-coral">Essayer mon premier look</Link></div>
        <div className="editorial-image editorial-image-tall image-frame-coral"><Image src={editorialImages.vibrantWoman} alt="Femme noire portant un look coloré dans un portrait mode" fill sizes="(max-width: 768px) 100vw, 42vw" /></div>
      </section>

      <section id="dressing" className="section wardrobe-section">
        <div className="section-shell">
          <div className="section-heading-row"><div><p className="eyebrow">VOTRE ESPACE</p><h2>Votre dressing devient<br/><em>plus vivant.</em></h2></div><p className="section-aside">Pas un catalogue de plus. Un espace qui apprend ce qui vous met en valeur.</p></div>
          <div className="steps-editorial">{steps.map(([number,title,description]) => <article className="step-line" key={number}><div className="step-number">{number}</div><h3>{title}</h3><p>{description}</p></article>)}</div>
        </div>
      </section>

      <section className="identity-section">
        <div className="identity-photo"><Image src={editorialImages.jewelryWoman} alt="Femme noire en tenue éditoriale avec bijoux colorés" fill sizes="(max-width: 768px) 100vw, 48vw" /></div>
        <div className="identity-copy"><p className="eyebrow eyebrow-light">AUTHENTICITÉ</p><h2>Pas une autre version de vous.</h2><div className="you-word">Vous.</div><p>Votre visage reste votre visage. Votre silhouette reste votre silhouette. Le meilleur look n’est pas celui qui efface votre identité : c’est celui qui la révèle.</p></div>
      </section>

      <section className="section section-shell process-section"><p className="eyebrow">SIMPLEMENT</p><h2>Choisissez. Essayez.<br /><em>Décidez.</em></h2><div className="process-grid"><div><span>01</span><h3>Choisissez une pièce</h3></div><div><span>02</span><h3>Voyez-la sur vous</h3></div><div><span>03</span><h3>Comparez vos looks</h3></div><div><span>04</span><h3>Décidez</h3></div></div><Link href="#commencer" className="button button-cobalt">Commencer mon Try-On</Link></section>

      <section id="styliste" className="section stylist-section colorful-stylist"><div className="section-shell stylist-grid"><div className="stylist-heading"><p className="eyebrow">PERSONAL SHOPPER</p><h2>Votre styliste personnel,<br /><em>toujours avec vous.</em></h2></div><div className="stylist-conversation"><p>« Je veux un look coloré pour ce week-end. »</p><p>« Je dois m’habiller pour un mariage. »</p><p>« Trouve-moi un look à moins de 150 €. »</p><p>« Avec quoi porter cette veste ? »</p></div><p className="statement-line">Vous demandez. <strong>Look&Go compose.</strong> Vous essayez. Vous décidez.</p></div></section>

      <section className="section section-shell use-cases-section"><p className="eyebrow">DU MATIN AU GRAND SOIR</p><h2>Un dressing pour<br /><em>toutes vos énergies.</em></h2><div className="use-cases-grid">{useCases.map(([title,description,src,tone]) => <article className={`use-case tone-${tone}`} key={title}><div className="use-case-image"><Image src={src} alt={`${title} — inspiration mode Look&Go`} fill sizes="(max-width: 768px) 88vw, 24vw" /></div><div className="use-case-copy"><h3>{title}</h3><p>{description}</p></div></article>)}</div></section>

      <section className="section personalization-section"><div className="section-shell personalization-inner"><div className="personalization-copy"><p className="eyebrow">PERSONNALISÉ POUR VOUS</p><h2>Les vêtements devraient s’adapter à vous.<br /><em>Pas l’inverse.</em></h2><div className="personalization-tags">{['TAILLE','MORPHOLOGIE','COLORIMÉTRIE','BUDGET','STYLE','OCCASION','MARQUES'].map(item => <span key={item}>{item}</span>)}</div></div><div className="editorial-image personalization-image image-frame-cobalt"><Image src={editorialImages.blueSuitMan} alt="Homme noir portant un costume bleu cobalt" fill sizes="(max-width: 768px) 100vw, 42vw" /></div></div></section>

      <section id="confidentialite" className="section section-shell privacy-section"><div className="privacy-rule"/><p className="eyebrow">ESPACE PRIVÉ</p><h2>Votre dressing<br/><em>reste privé.</em></h2><p>Vos photos et vos informations personnelles font partie de votre espace privé. Votre image vous appartient.</p><p className="demo-note">Les engagements techniques détaillés seront publiés après validation de l’architecture backend réelle.</p></section>

      <section id="commencer" className="final-cta"><div className="final-orb final-orb-one"/><div className="final-orb final-orb-two"/><div className="section-shell final-cta-inner"><p className="eyebrow">LOOK&GO</p><h2>Commencez<br/><em>par vous.</em></h2><p>Votre style n’a pas besoin d’être sage. Il a besoin d’être vous.</p><Link href="#connexion" className="button button-light">Créer mon dressing privé</Link><span>Quelques minutes suffisent pour commencer.</span></div></section>

      <footer id="connexion" className="site-footer section-shell"><div><div className="wordmark footer-wordmark">LOOK&GO</div><p>Your style. Your fit. Your choice.</p></div><nav aria-label="Navigation de pied de page"><Link href="#dressing">Dressing</Link><Link href="#try-on">Try-On</Link><Link href="#confidentialite">Confidentialité</Link></nav><p className="footer-note">Les fonctionnalités d’authentification et le Try-On réel seront raccordés uniquement lorsque leurs backends seront disponibles.</p></footer>
    </main>
  );
}
