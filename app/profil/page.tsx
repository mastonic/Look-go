import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { getProfileByUserId } from "@/lib/db";
import "./profil.css";

export default async function ProfilPage(){
  const session=await auth();
  if(!session?.user?.id) redirect("/connexion");
  const profile=getProfileByUserId(Number(session.user.id));
  const step=Number(profile?.onboarding_step || 1);
  const complete=Boolean(profile?.onboarding_complete);
  return <main className="account-page"><header className="account-header"><Link href="/" className="account-logo">LOOK&GO</Link><div><span>{session.user.email}</span><form action={async()=>{"use server";await signOut({redirectTo:"/"})}}><button>Déconnexion</button></form></div></header><section className="account-shell"><aside><p>MON ESPACE</p><h1>Bonjour<br/><em>{String(profile?.pseudo || session.user.name || "vous")}</em></h1><nav><Link href="/profil" className="active">Mon profil</Link><Link href="/inscription">Compléter mon profil</Link><Link href="/#shopping">Mes looks</Link><Link href="/#try-on">Try-On</Link></nav></aside><div className="account-content"><div className="profile-status"><div><span>PROFIL LOOK&GO</span><h2>{complete?"Votre profil est prêt.":"Continuons votre profil."}</h2><p>{complete?"Look&Go peut utiliser vos préférences enregistrées pour personnaliser vos recommandations.":`Vous êtes à l’étape ${step} sur 3. Complétez le parcours pour obtenir vos premières recommandations personnalisées.`}</p></div><Link href={step<=1?"/inscription":step===2?"/inscription/style":"/inscription/analyse"}>{complete?"Modifier mon profil":"Reprendre l’onboarding"} →</Link></div><div className="account-grid"><article><span>IDENTITÉ</span><strong>{String(profile?.pseudo || "À compléter")}</strong><p>{session.user.email}</p></article><article><span>MENSURATIONS</span><strong>{profile?.height_cm?`${profile.height_cm} cm":"À compléter"}</strong><p>{profile?.weight_kg?`${profile.weight_kg} kg":"Poids à renseigner"}</p></article><article><span>STYLE</span><strong>{String(profile?.budget_tier || "À définir")}</strong><p>{profile?.outfit_budget?`Budget tenue : ${profile.outfit_budget} €":"Budget à renseigner"}</p></article><article><span>CONNEXION</span><strong>{String(profile?.provider || "email")}</strong><p>Compte sécurisé</p></article></div><div className="account-note"><strong>SQLite prototype</strong><p>Les données de profil utilisent actuellement SQLite. Sur Vercel Preview, la base est temporaire ; une base SQLite persistante sera branchée avant mise en production.</p></div></div></section></main>
}
