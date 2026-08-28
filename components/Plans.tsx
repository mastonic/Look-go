const features = [
  ["Profil style, taille, couleurs & budget", true, true, true],
  ["3 propositions Signature / Équilibre / Smart", true, true, true],
  ["Dressing numérique", "Bêta", true, true],
  ["Suggestions de looks", "Bêta", true, "Étendu"],
  ["Personal Shopper conversationnel", "Bêta", true, "Avancé"],
  ["Virtual Try-On", "En test", "Quota supérieur", "Quota premium"],
  ["Analyse morphologie & colorimétrie", "En test", true, "Avancée"],
  ["Look complet sous un budget donné", false, true, true],
  ["Alternative moins chère / remix du look", false, true, true],
  ["Mélange de plusieurs boutiques", false, true, true],
  ["Composer avec les vêtements déjà possédés", false, true, true],
  ["Alertes baisse de prix / retour en stock", false, true, true],
  ["Comparateur & historique de looks", false, true, true],
  ["Conseils événements / voyage", false, true, true],
  ["Capsule wardrobe", false, false, true],
  ["Priorité de génération Try-On", false, false, true],
];

function Cell({value}:{value:boolean|string}) {
  if (value === true) return <span className="plan-yes">✓</span>;
  if (value === false) return <span className="plan-no">—</span>;
  return <span>{value}</span>;
}

export function Plans() {
  return <section id="offres" className="plans-section section"><div className="section-shell">
    <div className="plans-head"><p className="eyebrow">BÊTA LOOK&GO</p><h2>Testez le cœur du produit.<br/><em>Les options arrivent ensuite.</em></h2><p>Pendant la bêta, nous validons d’abord le profil, les trois budgets, la qualité des recommandations et le Try-On. Les abonnements et fonctions marchandes seront activés uniquement lorsqu’ils seront réellement connectés.</p></div>
    <div className="plans-table-wrap"><table className="plans-table"><thead><tr><th>Fonctionnalité</th><th>DÉCOUVERTE</th><th>PLUS</th><th>PREMIUM</th></tr></thead><tbody>{features.map(([name,basic,plus,premium]) => <tr key={String(name)}><th>{name}</th><td><Cell value={basic as boolean|string}/></td><td><Cell value={plus as boolean|string}/></td><td><Cell value={premium as boolean|string}/></td></tr>)}</tbody></table></div>
    <p className="plans-note">Aucun stock, partenariat, lien affilié, abonnement ou capacité Try-On n’est présenté comme actif avant validation de son backend.</p>
  </div></section>;
}
