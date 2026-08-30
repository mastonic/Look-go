import Link from "next/link";

const plans=[
 {name:"Découverte",price:"0 €",tag:"Pour découvrir",desc:"Découvrez votre profil style et vivez vos premiers essayages IA.",items:["Profil style, tailles, couleurs & budget","Smart · Équilibre · Signature","3 Try-On IA offerts à l’inscription","Dressing & favoris","Recommandations limitées"],cta:"Essayer gratuitement"},
 {name:"Essentiel",price:"6,99 €",period:"/ mois",tag:"Pour mieux acheter",desc:"Votre Personal Shopper pour trouver plus vite les looks qui vous correspondent.",items:["15 générations IA / mois","3 propositions + 3 alternatives","24 univers de style & tous types de vêtements","Dressing personnel & favoris","Personal Shopper & recommandations","Liens marchands quand disponibles"],cta:"Choisir Essentiel"},
 {name:"Privé",price:"12,99 €",period:"/ mois",tag:"LE PLUS CHOISI",desc:"L’expérience Look&Go complète pour faire de votre dressing un véritable service personnel.",items:["40 générations IA / mois","Tout Essentiel","Styliste IA avancé","Looks occasions & accessoires","Recommandations avec votre dressing","Fonctions IA premium selon quotas","Accès prioritaire aux nouveautés"],cta:"Choisir Privé",featured:true},
];

const packs=[
 {name:"Mariage Solo",price:"49 €",desc:"Wedding Profile, charte du mariage, Wedding Stylist IA, 3 + 3 propositions et Try-On pour une personne."},
 {name:"Mariage Duo",price:"99 €",desc:"Deux profils principaux coordonnés : mariée & marié, couple ou deux personnes de votre choix."},
 {name:"Mariage Cortège",price:"149 €",desc:"Coordination du couple et du cortège : témoins, demoiselles/garçons et enfants d’honneur."},
];

export function Plans(){return <section id="offres" className="plans-section section"><div className="section-shell">
 <div className="plans-head"><p className="eyebrow">CHOISISSEZ VOTRE LOOK&GO</p><h2>Vous ne payez pas pour acheter des vêtements.<br/><em>Vous choisissez mieux lesquels acheter.</em></h2><p>Votre abonnement finance votre Personal Shopper, vos recommandations et vos visualisations IA. Les vêtements restent achetés auprès des marchands lorsqu’un lien réel est disponible.</p></div>
 <div className="pricing-cards">{plans.map(p=><article key={p.name} className={`pricing-card ${p.featured?"pricing-featured":""}`}><span className="pricing-tag">{p.tag}</span><h3>{p.name}</h3><div className="pricing-price">{p.price} <small>{p.period||""}</small></div><p>{p.desc}</p><ul>{p.items.map(i=><li key={i}>✓ {i}</li>)}</ul><Link href="/connexion?mode=register" className={`button ${p.featured?"button-coral":"button-dark"}`}>{p.cta}</Link></article>)}</div>
 <div className="wedding-pricing"><div className="wedding-head"><p className="eyebrow">LOOK&GO · MON MARIAGE</p><h2>Votre mariage.<br/><em>Votre charte. Votre cortège.</em></h2><p>Une expérience dédiée pour coordonner les tenues autour du thème, des couleurs, des budgets et de la morphologie de chaque participant.</p></div><div className="wedding-pack-grid">{packs.map(p=><article key={p.name} className="wedding-pack"><span>PACK PONCTUEL</span><h3>{p.name}</h3><strong>{p.price}</strong><p>{p.desc}</p><Link href="/connexion?mode=register">Découvrir le pack →</Link></article>)}</div></div>
 <div className="beta-access"><strong>BÊTA TESTEUR · ACCÈS TOTAL</strong><p>Pendant la bêta, les testeurs accèdent aux fonctionnalités disponibles, au Pack Mariage et aux nouveautés sans les limitations commerciales des offres finales. Des garde-fous techniques peuvent s’appliquer aux générations IA.</p></div>
 <div className="plan-options"><p className="eyebrow">OPTIONS À LA CARTE</p><p><strong>Crédits IA supplémentaires</strong> · générations additionnelles · extensions Mariage · participants supplémentaires · fonctions vidéo lorsque leur fidélité est validée.</p></div>
 <p className="plans-note">Tarifs de lancement envisagés. Les abonnements, paiements, achats marchands et options ne sont facturés qu’après activation réelle de leurs services. Aucun stock, prix marchand ou partenariat n’est inventé.</p>
 </div></section>}
