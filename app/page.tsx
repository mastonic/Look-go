import Image from "next/image";
import Link from "next/link";
import { TryOnDemo } from "@/components/TryOnDemo";
import { BudgetLooks } from "@/components/BudgetLooks";
import { Plans } from "@/components/Plans";
import "./v31.css";

const editorialImages = {
  vibrantWoman: "https://images.unsplash.com/photo-1776790376541-233f911d90b4?auto=format&fit=crop&w=1600&q=88",
  jewelryWoman: "https://images.unsplash.com/photo-1767249629217-536a5ef26cc2?auto=format&fit=crop&w=1600&q=88",
  blueSuitMan: "https://images.unsplash.com/photo-1754485115876-9221149ccc19?auto=format&fit=crop&w=1600&q=88",
};

export default function HomePage() {
  return <main>
    <header className="site-header"><Link href="#top" className="wordmark">LOOK&GO</Link><nav className="desktop-nav"><Link href="#shopping">3 budgets</Link><Link href="#try-on">Try-On</Link><Link href="#styliste">Styliste</Link><Link href="#offres">Offres</Link></nav><div className="header-actions"><Link href="/connexion" className="text-link">Connexion</Link><Link href="/connexion?mode=register" className="button button-small button-dark">Créer mon dressing</Link></div></header>

    <section id="top" className="hero section-shell"><div className="hero-copy"><div className="v3-pill">PERSONAL SHOPPER · TRY-ON · SHOPPING</div><h1>Votre style.<br/>Trois budgets.<br/><em>À vous de choisir.</em></h1><p className="hero-intro">Look&Go compose des looks pour vous, avec l’objectif d’utiliser de vrais vêtements disponibles à l’achat : premium, prix modéré ou petit budget.</p><div className="cta-row"><Link href="#shopping" className="button button-coral">Voir les 3 styles</Link><Link href="#motion" className="button button-ghost">Comment ça marche</Link></div><div className="color-signals"><span>VRAIS PRODUITS</span><span>PRIX</span><span>TRY-ON</span><span>SHOPPING</span></div></div><div className="hero-visual"><div className="hero-sun"/><TryOnDemo/><div className="hero-sticker">3<br/>BUDGETS</div></div></section>

    <section className="marquee" aria-hidden="true"><div>UN STYLE · TROIS BUDGETS · VOIR SUR MOI · CHOISIR · ACHETER · UN STYLE · TROIS BUDGETS ·</div></section>

    <BudgetLooks />

    <section id="motion" className="motion-story"><div className="motion-story-inner"><div className="motion-head"><div><p className="eyebrow eyebrow-light">LE CONCEPT EN MOUVEMENT</p><h2>Demandez.<br/><em>Comparez. Essayez.</em></h2></div><div><p>Une demande devient trois propositions de budget. Look&Go sélectionne les pièces, compose le look, vous permet de le visualiser puis vous dirige vers le marchand lorsque l’intégration est disponible.</p><div className="photo-real-note">Animation illustrative — aucun stock ou prix fictif n’est présenté comme réel.</div></div></div><div className="motion-track"><article className="motion-card"><div className="motion-dot"/><span>01 · DEMANDE</span><h3>« Mariage, chic, 200 €. »</h3><p>Occasion, style, morphologie et budget donnent le contexte.</p></article><article className="motion-card"><div className="motion-dot"/><span>02 · 3 BUDGETS</span><h3>Signature. Équilibre. Smart.</h3><p>Trois chemins de prix, une même intention stylistique.</p></article><article className="motion-card"><div className="motion-dot"/><span>03 · TRY-ON</span><h3>Voir sur moi.</h3><p>Comparez les looks avant de décider quoi garder ou acheter.</p></article><article className="motion-card"><div className="motion-dot"/><span>04 · SHOPPING</span><h3>Acheter la vraie pièce.</h3><p>Le lien marchand ou affilié mène vers le produit lorsque le catalogue réel est raccordé.</p></article></div></div></section>

    <section id="try-on" className="section section-shell split-section colorful-split"><div className="section-kicker">TRY-ON</div><div className="section-copy-large"><h2>Voyez le look.<br/><em>Avant de l’acheter.</em></h2><p>Le Try-On devient la passerelle entre la recommandation et l’achat : Signature, Équilibre ou Smart, comparez d’abord sur vous.</p><Link href="/connexion?mode=register" className="button button-coral">Voir sur moi</Link></div><div className="editorial-image editorial-image-tall image-frame-coral"><Image src={editorialImages.vibrantWoman} alt="Portrait mode naturel d’une femme noire portant une tenue colorée" fill sizes="(max-width:768px) 100vw,42vw"/></div></section>

    <section id="styliste" className="section stylist-section colorful-stylist"><div className="section-shell stylist-grid"><div className="stylist-heading"><p className="eyebrow">PERSONAL SHOPPER</p><h2>Votre budget devient<br/><em>une contrainte créative.</em></h2></div><div className="stylist-conversation"><p>« Je veux un look premium pour un mariage. »</p><p>« Fais-moi le même style sous 200 €. »</p><p>« Remplace seulement les chaussures par moins cher. »</p><p>« Utilise ma veste et complète la tenue. »</p></div><p className="statement-line">Vous demandez. <strong>Look&Go compose.</strong> Vous comparez. Vous essayez. Vous achetez où vous voulez.</p></div></section>

    <section className="identity-section"><div className="identity-photo"><Image src={editorialImages.jewelryWoman} alt="Portrait éditorial naturel d’une femme noire" fill sizes="(max-width:768px) 100vw,48vw"/></div><div className="identity-copy"><p className="eyebrow eyebrow-light">AUTHENTICITÉ</p><h2>Le prix change.<br/>Pas votre identité.</h2><div className="you-word">Vous.</div><p>Le look Smart ne doit pas être une mauvaise copie du Signature. Chaque proposition doit rester cohérente avec votre silhouette, vos couleurs et votre style.</p></div></section>

    <section className="section personalization-section"><div className="section-shell personalization-inner"><div className="personalization-copy"><p className="eyebrow">LE MOTEUR LOOK&GO</p><h2>Les bonnes pièces.<br/><em>Dans le bon budget.</em></h2><div className="personalization-tags">{['TAILLE','MORPHOLOGIE','COLORIMÉTRIE','BUDGET','STYLE','OCCASION','STOCK','PRIX'].map(x=><span key={x}>{x}</span>)}</div></div><div className="editorial-image personalization-image image-frame-cobalt"><Image src={editorialImages.blueSuitMan} alt="Homme noir dans une tenue bleu cobalt" fill sizes="(max-width:768px) 100vw,42vw"/></div></div></section>

    <Plans />

    <section id="commencer" className="final-cta"><div className="final-orb final-orb-one"/><div className="final-orb final-orb-two"/><div className="section-shell final-cta-inner"><p className="eyebrow">LOOK&GO</p><h2>Votre look.<br/><em>Votre budget.</em></h2><p>Commencez par votre profil. Look&Go s’occupe de réduire les choix.</p><Link href="/connexion?mode=register" className="button button-light">Créer mon dressing privé</Link><span>Les achats réels seront activés marchand par marchand après connexion des catalogues autorisés.</span></div></section>

    <footer className="site-footer section-shell"><div><div className="wordmark footer-wordmark">LOOK&GO</div><p>Your style. Your fit. Your choice.</p></div><nav><Link href="#shopping">3 budgets</Link><Link href="#try-on">Try-On</Link><Link href="#offres">Offres</Link><Link href="/connexion">Connexion</Link></nav><p className="footer-note">Look&Go distingue explicitement les démonstrations UI des fonctionnalités connectées. Aucun partenariat, prix, stock ou commission d’affiliation n’est inventé.</p></footer>
  </main>;
}
