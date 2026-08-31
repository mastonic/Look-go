"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readBetaProfile, saveBetaProfile, type BetaProfile } from "@/lib/beta-profile";
import { readBetaProfileCloud, saveBetaProfileCloud } from "@/lib/firebase-beta";
import "./auth.css";

function hasIdentity(profile:BetaProfile){
  return Boolean(profile.email || profile.pseudo);
}

function nextBetaPath(profile:BetaProfile){
  if(profile.complete) return "/profil";
  const identityReady=Boolean(
    profile.email &&
    profile.pseudo &&
    profile.height &&
    profile.weight &&
    profile.age &&
    profile.portraitName &&
    profile.fullName
  );
  return identityReady ? "/inscription/style" : "/inscription";
}

export default function ConnexionPage(){
  const router=useRouter();
  const [error,setError]=useState("");
  const [checking,setChecking]=useState(true);

  useEffect(()=>{
    let alive=true;
    (async()=>{
      const local=readBetaProfile();
      let cloud:BetaProfile|null=null;
      try{cloud=await readBetaProfileCloud();}catch{}
      if(!alive)return;
      const merged={...(cloud||{}),...local};
      if(hasIdentity(merged)){
        saveBetaProfile(merged);
        router.replace(nextBetaPath(merged));
        return;
      }
      setChecking(false);
    })();
    return()=>{alive=false};
  },[router]);

  async function startBeta(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setError("");
    const fd=new FormData(e.currentTarget);
    const email=String(fd.get("email")||"").trim();
    const name=String(fd.get("name")||"").trim();
    if(!name){setError("Entrez votre prénom ou pseudo.");return;}
    if(!email || !email.includes("@")){setError("Entrez une adresse email valide.");return;}
    const profile={email,pseudo:name,complete:false};
    saveBetaProfile(profile);
    try{await saveBetaProfileCloud(profile);}catch{}
    window.location.href="/inscription";
  }

  if(checking){
    return <main className="auth-page"><section className="auth-shell"><div className="auth-panel"><p className="auth-privacy">Recherche de votre espace Look&Go…</p></div></section></main>;
  }

  return <main className="auth-page">
    <header className="auth-header"><Link href="/" className="auth-logo">LOOK&GO</Link><Link href="/">Retour au site</Link></header>
    <section className="auth-shell">
      <div className="auth-story"><p>BÊTA PRIVÉE LOOK&GO</p><h1>Testez votre <em>premier look.</em></h1><span>Créez votre profil une seule fois. À votre retour, Look&Go vous ramènera automatiquement dans votre espace ou à l’étape où vous vous êtes arrêté.</span></div>
      <div className="auth-panel">
        <div className="auth-tabs"><button className="active" type="button">Nouvel accès bêta</button></div>
        <form onSubmit={startBeta}>
          <label>Prénom ou pseudo<input name="name" required minLength={2} placeholder="Votre prénom ou pseudo" autoComplete="nickname"/></label>
          <label>Email<input name="email" type="email" required autoComplete="email" placeholder="vous@exemple.fr"/></label>
          {error&&<div className="auth-error">{error}</div>}
          <button className="auth-submit" type="submit">Démarrer mon test →</button>
        </form>
        <p className="auth-privacy">Votre progression est conservée localement et synchronisée avec Firebase lorsque le service cloud est configuré. Un compte durable sera utilisé pour retrouver le même espace sur plusieurs appareils.</p>
      </div>
    </section>
  </main>;
}
