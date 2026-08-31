"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { finishBetaEmailLink, isBetaEmailLink, readBetaProfileCloud, saveBetaProfileCloud, storedBetaEmail } from "@/lib/firebase-beta";
import { readBetaProfile, saveBetaProfile } from "@/lib/beta-profile";
import "../../connexion/auth.css";

export default function FinishBetaAuth(){
 const router=useRouter();const [email,setEmail]=useState("");const [error,setError]=useState("");const [working,setWorking]=useState(false);const [valid,setValid]=useState(true);
 useEffect(()=>{setEmail(storedBetaEmail()||readBetaProfile().email||"");setValid(isBetaEmailLink());},[]);
 async function finish(e:FormEvent){e.preventDefault();setError("");setWorking(true);if(!email.includes("@")){setError("Entrez l’email utilisé pour Look&Go.");setWorking(false);return;}const ok=await finishBetaEmailLink(email);if(!ok){setError("Le lien n’a pas pu être validé. Il a peut-être expiré : demandez un nouveau lien depuis la connexion.");setWorking(false);return;}const local=readBetaProfile();const cloud=await readBetaProfileCloud();const merged={...(cloud||{}),...local,email};saveBetaProfile(merged);await saveBetaProfileCloud(merged);router.replace(merged.complete?"/profil":"/start");}
 return <main className="auth-page"><header className="auth-header"><Link href="/" className="auth-logo">LOOK&GO</Link><Link href="/connexion">Connexion</Link></header><section className="auth-shell"><div className="auth-story"><p>ESPACE PRIVÉ</p><h1>Retrouvez votre <em>Look&Go.</em></h1><span>Ce lien sécurise votre espace avec votre email pour pouvoir le retrouver sur un autre appareil.</span></div><div className="auth-panel">{valid?<form onSubmit={finish}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required placeholder="vous@exemple.fr"/></label>{error&&<div className="auth-error">{error}</div>}<button className="auth-submit" disabled={working}>{working?"Connexion…":"Ouvrir mon espace →"}</button></form>:<><div className="auth-error">Ce lien de connexion n’est pas valide ou a expiré.</div><Link href="/connexion" className="auth-submit">Demander un nouveau lien →</Link></>}</div></section></main>;
}
