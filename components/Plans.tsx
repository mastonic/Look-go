const features = [
  ["Profil style, taille, couleurs & budget", true, true, true],
  ["3 propositions Signature / Équilibre / Smart", true, true, true],
  ["Produits achetables & liens marchands", true, true, true],
  ["Dressing numérique", "Limité", true, true],
  ["Suggestions de looks", "Limité", true, "Étendu"],
  ["Personal Shopper conversationnel", "Découverte", true, "Avancé"],
  ["Virtual Try-On", "Essais découverte", "Quota supérieur", "Quota premium"],
  ["Analyse morphologie & colorimétrie", false, true, "Avancée"],
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
    <div className="plans-head"><p className="eyebrow">DU BASIC AU PREMIUM</p><h2>Commencez simplement.<br/><em>Débloquez votre dressing.</em></h2><p>La structure tarifaire définit les niveaux fonctionnels. Les prix d’abonnement seront fixés après mesure du coût réel du Try-On et des services IA.</p></div>
    <div className="plans-table-wrap"><table className="plans-table"><thead><tr><th>Fonctionnalité</th><th>BASIC</th><th>PLUS</th><th>PREMIUM</th></tr></thead><tbody>{features.map(([name,basic,plus,premium]) => <tr key={String(name)}><th>{name}</th><td><Cell value={basic as boolean|string}/></td><td><Cell value={plus as boolean|string}/></td><td><Cell value={premium as boolean|string}/></td></tr>)}</tbody></table></div>
    <p className="plans-note">Les fonctionnalités dépendant de catalogues marchands, de l’affiliation, des stocks, des alertes et du Try-On réel ne seront annoncées comme actives qu’après connexion et validation de leurs backends respectifs.</p>
  </div></section>;
}
