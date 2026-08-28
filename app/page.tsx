import Image from "next/image";
import Link from "next/link";
import { TryOnDemo } from "@/components/TryOnDemo";

const editorialImages = {
  wardrobe:
    "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1400&q=84",
  city:
    "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=1400&q=84",
  evening:
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1400&q=84",
  detail:
    "https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=1400&q=84",
};

const steps = [
  ["01", "Votre profil privé", "Vos préférences, votre silhouette, vos couleurs et vos habitudes deviennent le point de départ."],
  ["02", "Votre sélection", "Des pièces cohérentes avec votre style, votre budget et l’occasion — sans vous noyer dans le choix."],
  ["03", "Votre Try-On", "Vous visualisez un look sur vous avant de décider de l’intégrer à votre dressing."],
  ["04", "Votre dressing", "Vos pièces, vos idées et vos looks réunis dans un espace pensé autour de vous."],
];

const useCases = [
  ["Aujourd’hui", "Une tenue adaptée à votre journée.", editorialImages.city],
  ["Une occasion", "Dîner, mariage, rendez-vous ou voyage.", editorialImages.evening],
  ["Une nouvelle pièce", "Découvrir comment l’intégrer à votre dressing.", editorialImages.detail],
  ["Une envie", "Changer de style sans changer qui vous êtes.", editorialImages.wardrobe],
];

export default function HomePage() {
  return (
    <main>
      <header className="site-header">
        <Link href="#top" className="wordmark" aria-label="Look&Go, accueil">LOOK&GO</Link>
        <nav className="desktop-nav" aria-label="Navigation principale">
          <Link href="#try-on">Try-On</Link>
          <Link href="#dressing">Dressing</Link>
          <Link href="#styliste">Styliste</Link>
          <Link href="#confidentialite">Confidentialité</Link>
        </nav>
        <div className="header-actions">
          <Link href="#connexion" className="text-link">Connexion</Link>
          <Link href="#commencer" className="button button-small button-dark">Créer mon dressing</Link>
        </div>
      </header>

      <section id="top" className="hero section-shell">
        <div className="hero-copy">
          <p className="eyebrow">DRESSING PRIVÉ · PERSONAL SHOPPER · TRY-ON</p>
          <h1>
            Votre dressing.<br />
            Votre style.<br />
            <em>Avant même de l’essayer.</em>
          </h1>
          <p className="hero-intro">
            Découvrez les vêtements qui vous ressemblent vraiment, visualisez-les sur vous et composez votre dressing idéal avec votre styliste personnel.
          </p>
          <div className="cta-row">
            <Link href="#commencer" className="button button-dark">Créer mon dressing privé</Link>
            <Link href="#try-on" className="button button-ghost">Découvrir le Try-On</Link>
          </div>
          <p className="microcopy">Essayage virtuel · Sélections personnalisées · Pièces réellement disponibles lorsque les catalogues sont connectés</p>
        </div>
        <div className="hero-visual">
          <TryOnDemo />
        </div>
      </section>

      <section id="try-on" className="section section-shell split-section">
        <div className="section-kicker">TRY-ON</div>
        <div className="section-copy-large">
          <h2>Essayez-le.<br /><em>Avant de l’acheter.</em></h2>
          <p>Vous aimez une pièce. Mais est-ce qu’elle vous ira vraiment ? Look&Go vous permet de découvrir votre look directement sur vous avant de commander.</p>
          <Link href="#commencer" className="underlined-link">Essayer mon premier look ↗</Link>
        </div>
        <div className="editorial-image editorial-image-tall">
          <Image src={editorialImages.evening} alt="Silhouette mode dans une ambiance éditoriale" fill sizes="(max-width: 768px) 100vw, 42vw" />
        </div>
      </section>

      <section id="dressing" className="section section-shell wardrobe-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">VOTRE ESPACE</p>
            <h2>Votre dressing devient <em>intelligent.</em></h2>
          </div>
          <p className="section-aside">Pas un catalogue de plus.</p>
        </div>
        <div className="steps-editorial">
          {steps.map(([number, title, description]) => (
            <article className="step-line" key={number}>
              <div className="step-number">{number}</div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="authenticity-section">
        <div className="section-shell authenticity-inner">
          <p className="eyebrow eyebrow-light">AUTHENTICITÉ</p>
          <h2>Pas une autre version de vous.</h2>
          <div className="you-word">Vous.</div>
          <div className="authenticity-copy">
            <p>Votre visage reste votre visage. Votre silhouette reste votre silhouette.</p>
            <p>Look&Go n’a pas vocation à inventer une personne parfaite. L’expérience est pensée pour vous aider à découvrir comment une tenue peut s’intégrer à votre identité, votre morphologie et votre style.</p>
            <p>Parce que le meilleur look n’est pas celui qui transforme quelqu’un. C’est celui dans lequel on se reconnaît.</p>
          </div>
        </div>
      </section>

      <section className="section section-shell process-section">
        <p className="eyebrow">SIMPLEMENT</p>
        <h2>Choisissez. Essayez.<br /><em>Décidez.</em></h2>
        <div className="process-grid">
          <div><span>01</span><h3>Choisissez une pièce</h3></div>
          <div><span>02</span><h3>Essayez-la virtuellement</h3></div>
          <div><span>03</span><h3>Comparez les looks</h3></div>
          <div><span>04</span><h3>Décidez</h3></div>
        </div>
        <Link href="#commencer" className="button button-dark">Commencer mon Try-On</Link>
      </section>

      <section id="styliste" className="section section-shell stylist-section">
        <div className="stylist-heading">
          <p className="eyebrow">PERSONAL SHOPPER</p>
          <h2>Votre styliste personnel,<br /><em>toujours avec vous.</em></h2>
        </div>
        <div className="stylist-conversation" aria-label="Exemples de demandes au styliste personnel">
          <p>« Je dois m’habiller pour un mariage. »</p>
          <p>« Je cherche quelque chose pour travailler demain. »</p>
          <p>« Je veux porter cette veste mais je ne sais pas avec quoi. »</p>
          <p>« Trouve-moi un look à moins de 150 €. »</p>
        </div>
        <p className="statement-line">Vous demandez. <strong>Look&Go compose.</strong> Vous essayez. Vous décidez.</p>
      </section>

      <section className="section shopping-section">
        <div className="section-shell shopping-grid">
          <div className="shopping-copy">
            <p className="eyebrow">SHOPPING CURATÉ</p>
            <h2>Trouvez moins.<br /><em>Choisissez mieux.</em></h2>
            <p>Des centaines de nouveautés apparaissent chaque jour. Vous n’avez pas besoin de toutes les voir. Vous avez besoin de voir les bonnes.</p>
            <div className="preference-list" aria-label="Critères de sélection">
              {['STYLE', 'MORPHOLOGIE', 'BUDGET', 'COULEURS', 'OCCASION', 'PRÉFÉRENCES'].map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
          <div className="editorial-image shopping-image">
            <Image src={editorialImages.wardrobe} alt="Portant de vêtements dans un dressing raffiné" fill sizes="(max-width: 768px) 100vw, 48vw" />
          </div>
        </div>
      </section>

      <section className="section section-shell use-cases-section">
        <p className="eyebrow">DU QUOTIDIEN À L’OCCASION</p>
        <h2>Du matin<br /><em>au grand soir.</em></h2>
        <div className="use-cases-grid">
          {useCases.map(([title, description, src]) => (
            <article className="use-case" key={title}>
              <div className="use-case-image">
                <Image src={src} alt="" fill sizes="(max-width: 768px) 88vw, 24vw" />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section personalization-section">
        <div className="section-shell personalization-inner">
          <div className="personalization-copy">
            <p className="eyebrow">PERSONNALISÉ POUR VOUS</p>
            <h2>Les vêtements devraient s’adapter à vous.<br /><em>Pas l’inverse.</em></h2>
            <div className="personalization-tags">
              {['TAILLE', 'MORPHOLOGIE', 'COLORIMÉTRIE', 'BUDGET', 'STYLE', 'OCCASION', 'MARQUES'].map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
          <div className="editorial-image personalization-image">
            <Image src={editorialImages.detail} alt="Détail d’un look mode contemporain" fill sizes="(max-width: 768px) 100vw, 42vw" />
          </div>
        </div>
      </section>

      <section id="confidentialite" className="section section-shell privacy-section">
        <div className="privacy-rule" />
        <p className="eyebrow">ESPACE PRIVÉ</p>
        <h2>Votre dressing<br /><em>reste privé.</em></h2>
        <p>Vos photos et vos informations personnelles font partie de votre espace privé. La confidentialité doit être aussi naturelle que l’expérience elle-même. Votre image vous appartient.</p>
        <p className="demo-note">Les engagements techniques détaillés concernant stockage, chiffrement, suppression et conservation seront publiés uniquement après validation de l’architecture backend réelle.</p>
      </section>

      <section id="commencer" className="final-cta">
        <div className="section-shell final-cta-inner">
          <p className="eyebrow">LOOK&GO</p>
          <h2>Commencez<br /><em>par vous.</em></h2>
          <p>Créez votre profil. Découvrez votre sélection. Essayez votre premier look.</p>
          <Link href="#connexion" className="button button-light">Créer mon dressing privé</Link>
          <span>Quelques minutes suffisent pour commencer.</span>
        </div>
      </section>

      <footer id="connexion" className="site-footer section-shell">
        <div>
          <div className="wordmark footer-wordmark">LOOK&GO</div>
          <p>Your style. Your fit. Your choice.</p>
        </div>
        <nav aria-label="Navigation de pied de page">
          <Link href="#dressing">Dressing</Link>
          <Link href="#try-on">Try-On</Link>
          <Link href="#confidentialite">Confidentialité</Link>
        </nav>
        <p className="footer-note">Les routes d’authentification, conditions et contact seront branchées lorsque les écrans correspondants existeront réellement.</p>
      </footer>
    </main>
  );
}
