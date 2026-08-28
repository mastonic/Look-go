import Image from "next/image";
import Link from "next/link";
import { TryOnDemo } from "@/components/TryOnDemo";
import { BudgetLooks } from "@/components/BudgetLooks";
import { Plans } from "@/components/Plans";
import "./v31.css";
import "./brand.css";

const editorialImages = {
  vibrantWoman: "https://images.unsplash.com/photo-1776790376541-233f911d90b4?auto=format&fit=crop&w=1600&q=88",
  jewelryWoman: "https://images.unsplash.com/photo-1767249629217-536a5ef26cc2?auto=format&fit=crop&w=1600&q=88",
  blueSuitMan: "https://images.unsplash.com/photo-1754485115876-9221149ccc19?auto=format&fit=crop&w=1600&q=88",
};

export default function HomePage() {
  return <main>
    <header className="site-header"><Link href="#top" className="brand-lockup" aria-label="Look&Go, accueil"><Image src="/lookgo-logo.svg" alt="" width={720} height={180} priority className="brand-logo"/></Link><nav className="desktop-nav"><Link href="#shopping">3 budgets</Link><Link href="#try-on">Try-On</Link><Link href="#styliste">Styliste</Link><Link href="#offres">Bêta</Link></nav><div className="header-actions"><Link href="/connexion?mode=register" className="text-link">Accès bêta</Link><Link href="/connexion?mode=register" className="button button-small button-dark">Démarrer</Link></div></header>

    <section id="top" className="hero section-shell"><div className="hero-copy"><div className="v3-pill">PERSONAL SHOPPER · TRY-ON · 3 BUDGETS</div><h1>Votre style.<br/>Trois budgets.<br/><em>À vous de choisir.</em></h1><p className="hero-intro">Look&Go apprend votre style, vos tailles et votre budget pour construire trois directions : Signature, Équilibre et Smart. La bêta sert à valider ce parcours avant l’activation progressive des achats réels.</p><div className="cta-row"><Link href="/connexion?mode=register" className="button button-coral">Lancer mon test bêta</Link><Link href="#motion" className="button button-ghost">Comment ça marche</Link></div><div className="color-signals"><span>PROFIL</span><span>3 BUDGETS</span><span>TRY-ON BÊTA</span><span>STYLE</span></div></div><div className="hero-visual"><div className="hero-sun"/><TryOnDemo/><div className="hero-sticker">3<br/>BUDGETS</div></div></section>

    <section className="marquee" aria-hidden="true"><div>UN STYLE · TROIS BUDGETS · VOIR SUR MOI · CHOISIR · TESTER · UN STYLE · TROIS BUDGETS ·</div></section>

    <BudgetLooks />

    <section id="motion" className="motion-story"><div className="motion-story-inner"><div className="motion-head"><div><p className="eyebrow eyebrow-light">LE PARCOURS BÊTA</p><h2>Profil.<br/><em>Comparez. Essayez.</em></h2></div><div><p>Vous renseignez votre profil, vos tailles, votre style et votre budget. Look&Go construit trois directions cohérentes puis prépare le passage au Try-On réel.</p><div className="photo-real-note">Bêta fonctionnelle — les fonctionnalités non connectées sont explicitement indiquées.</div></div></div><div className="motion-track"><article className="motion-card"><div className="motion-dot"/><span>01 · PROFIL</span><h3>Portrait, silhouette, tailles.</h3><p>Les références servent à personnaliser votre expérience et le futur Try-On.</p></article><article className="motion-card"><div className="motion-dot"/><span>02 · STYLE</span><h3>Goûts, couleurs, budget.</h3><p>Vos préférences donnent la direction créative.</p></article><article className="motion-card"><div className="motion-dot"/><span>03 · 3 BUDGETS</span><h3>Signature. Équilibre. Smart.</h3><p>Trois chemins de prix, une même intention stylistique.</p></article><article className="motion-card"><div className="motion-dot"/><span>04 · TRY-ON</span><h3>Voir sur moi.</h3><p>Le moteur Try-On réel est le prochain bloc branché dans la bêta.</p></article></div></div></section>

    <section id="try-on" className="section section-shell split-section colorful-split"><div className="section-kicker">TRY-ON BÊTA</div><div className="section-copy-large"><h2>Voyez le look.<br/><em>Avant de l’acheter.</em></h2><p>Le Try-On utilisera votre portrait comme référence d’identité et votre photo plein pied comme référence de silhouette. Pendant la bêta, nous validons d’abord la qualité et la fidélité du résultat.</p><Link href="/connexion?mode=register" className="button button-coral">Préparer mon Try-On</Link></div><div className="editorial-image editorial-image-tall image-frame-coral"><Image src={editorialImages.vibrantWoman} alt="Portrait mode naturel d’une femme noire portant une tenue colorée" fill sizes="(max-width:768px) 100vw,42vw"/></div></section>

    <section id="styliste" className="section stylist-section colorful-stylist"><div className="section-shell stylist-grid"><div className="stylist-heading"><p className="eyebrow">PERSONAL SHOPPER</p><h2>Votre budget devient<br/><em>une contrainte créative.</em></h2></div><div className="stylist-conversation"><p>« Je veux un look premium pour un mariage. »</p><p>« Fais-moi le même style sous 200 €. »</p><p>« Remplace seulement les chaussures par moins cher. »</p><p>« Utilise ma veste et complète la tenue. »</p></div><p className="statement-line">Vous demandez. <strong>Look&Go compose.</strong> Vous comparez. Vous essayez. Puis les achats réels seront activés lorsque les catalogues seront connectés.</p></div></section>

    <section className="identity-section"><div className="identity-photo"><Image src={editorialImages.jewelryWoman} alt="Portrait éditorial naturel d’une femme noire" fill sizes="(max-width:768px) 100vw,48vw"/></div><div className="identity-copy"><p className="eyebrow eyebrow-light">AUTHENTICITÉ</p><h2>Le prix change.<br/>Pas votre identité.</h2><div className="you-word">Vous.</div><p>Le look Smart ne doit pas être une mauvaise copie du Signature. Chaque proposition doit rester cohérente avec votre silhouette, vos couleurs et votre style.</p></div></section>

    <section className="section personalization-section"><div className="section-shell personalization-inner"><div className="personalization-copy"><p className="eyebrow">LE MOTEUR LOOK&GO</p><h2>Les bonnes pièces.<br/><em>Dans le bon budget.</em></h2><div className="personalization-tags">{['TAILLE','MORPHOLOGIE','COULEURS','BUDGET','STYLE','OCCASION','PRÉFÉRENCES'].map(x=><span key={x}>{x}</span>)}</div></div><div className="editorial-image personalization-image image-frame-cobalt"><Image src={editorialImages.blueSuitMan} alt="Homme noir dans une tenue bleu cobalt" fill sizes="(max-width:768px) 100vw,42vw"/></div></div></section>

    <Plans />

    <section id="commencer" className="final-cta"><div className="final-orb final-orb-one"/><div className="final-orb final-orb-two"/><div className="section-shell final-cta-inner"><p className="eyebrow">BÊTA LOOK&GO</p><h2>Votre look.<br/><em>Votre budget.</em></h2><p>Commencez par votre profil et testez le parcours complet.</p><Link href="/connexion?mode=register" className="button button-light">Démarrer mon test bêta</Link><span>Aucune fonction marchande n’est présentée comme active avant sa connexion réelle.</span></div></section>

    <footer className="site-footer section-shell"><div><Image src="/lookgo-logo.svg" alt="Look&Go" width={720} height={180} className="footer-brand-logo"/><p>Your style. Your fit. Your choice.</p></div><nav><Link href="#shopping">3 budgets</Link><Link href="#try-on">Try-On</Link><Link href="#offres">Bêta</Link><Link href="/connexion?mode=register">Démarrer</Link></nav><p className="footer-note">Look&Go distingue explicitement les démonstrations UI des fonctionnalités réellement connectées. Aucun partenariat, prix, stock ou commission d’affiliation n’est inventé.</p></footer>
  </main>;
}
