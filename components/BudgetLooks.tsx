import Link from "next/link";

const looks = [
  {
    tier: "SIGNATURE",
    label: "Premium",
    budget: "Budget libre / premium",
    description: "La version la plus désirable du look, en mélangeant les meilleures pièces disponibles selon votre style.",
    examples: ["Pièce forte · boutique premium", "Haut · marque mode", "Bas · boutique premium", "Chaussures · premium"],
    tone: "signature",
  },
  {
    tier: "ÉQUILIBRE",
    label: "Prix modéré",
    budget: "Le meilleur rapport style / prix",
    description: "Le même esprit, avec des enseignes et des pièces de gamme intermédiaire pour maîtriser le budget.",
    examples: ["Veste · milieu de gamme", "Haut · accessible", "Bas · milieu de gamme", "Chaussures · accessible"],
    tone: "balance",
  },
  {
    tier: "SMART",
    label: "Petit budget",
    budget: "Le style avant le prix",
    description: "Une alternative économique construite autour des promotions et enseignes accessibles disponibles.",
    examples: ["Veste · value", "Haut · discount", "Bas · discount", "Chaussures · petit prix"],
    tone: "smart",
  },
];

export function BudgetLooks() {
  return (
    <section id="shopping" className="budget-looks section">
      <div className="section-shell">
        <div className="budget-head">
          <div><p className="eyebrow eyebrow-light">VOS 3 BUDGETS</p><h2>Un style.<br/><em>Trois budgets.</em></h2></div>
          <div><p>En bêta, Look&Go teste d’abord votre profil, vos tailles et votre budget. Les vrais catalogues marchands et leurs liens d’achat seront activés progressivement après validation des intégrations.</p><span className="truth-badge">BÊTA · AUCUN FAUX STOCK</span></div>
        </div>
        <div className="budget-grid">
          {looks.map((look, index) => (
            <article className={`budget-card budget-${look.tone}`} key={look.tier}>
              <div className="budget-card-top"><span>0{index + 1}</span><span>{look.label}</span></div>
              <h3>{look.tier}</h3>
              <p className="budget-caption">{look.budget}</p>
              <p>{look.description}</p>
              <div className="piece-list">{look.examples.map(item => <div key={item}><span>↗</span>{item}</div>)}</div>
              <div className="budget-actions"><Link href="/connexion?mode=register" className="button budget-button">Tester ce style sur moi</Link><span className="truth-badge">Achat réel bientôt</span></div>
            </article>
          ))}
        </div>
        <div className="budget-remix"><span>LOOK&GO REMIX</span><p>« J’aime le look Signature, mais je veux rester sous 200 €. »</p><strong>Le styliste conserve l’intention du look et remplace les pièces qui dépassent votre budget.</strong></div>
      </div>
    </section>
  );
}
