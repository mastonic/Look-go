"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { saveBetaProfile } from "@/lib/beta-profile";
import "./auth.css";

export default function ConnexionPage(){
  const [error,setError]=useState("");

  function startBeta(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setError("");
    const fd=new FormData(e.currentTarget);
    const email=String(fd.get("email")||"").trim();
    const name=String(fd.get("name")||"").trim();
    if(!name){setError("Entrez votre prénom ou pseudo.");return;}
    if(!email || !email.includes("@")){setError("Entrez une adresse email valide.");return;}
    saveBetaProfile({email,pseudo:name,complete:false});
    window.location.href="/inscription";
  }

  return <main className="auth-page">
    <header className="auth-header"><Link href="/" className="auth-logo">LOOK&GO</Link><Link href="/">Retour au site</Link></header>
    <section className="auth-shell">
      <div className="auth-story"><p>BÊTA PRIVÉE LOOK&GO</p><h1>Testez votre <em>premier look.</em></h1><span>Créez votre profil, indiquez vos tailles, votre style et votre budget, puis découvrez vos trois directions Signature, Équilibre et Smart.</span></div>
      <div className="auth-panel">
        <div className="auth-tabs"><button className="active" type="button">Accès bêta</button></div>
        <form onSubmit={startBeta}>
          <label>Prénom ou pseudo<input name="name" required minLength={2} placeholder="Votre prénom ou pseudo" autoComplete="nickname"/></label>
          <label>Email<input name="email" type="email" required autoComplete="email" placeholder="vous@exemple.fr"/></label>
          {error&&<div className="auth-error">{error}</div>}
          <button className="auth-submit" type="submit">Démarrer mon test →</button>
        </form>
        <p className="auth-privacy">Bêta actuelle : aucun mot de passe n’est demandé. Les informations du test sont conservées dans ce navigateur. Les photos ne sont pas encore envoyées vers un stockage cloud permanent.</p>
      </div>
    </section>
  </main>;
}
