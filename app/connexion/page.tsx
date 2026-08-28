"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import "./auth.css";

export default function ConnexionPage(){
  const [mode,setMode]=useState<"login"|"register">("login");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  useEffect(()=>{if(new URLSearchParams(window.location.search).get("mode")==="register") setMode("register");},[]);

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setError(""); setLoading(true);
    const fd=new FormData(e.currentTarget); const email=String(fd.get("email")||""); const password=String(fd.get("password")||""); const name=String(fd.get("name")||"");
    try{
      if(mode==="register"){
        const res=await fetch("/api/register",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password,name})});
        const data=await res.json(); if(!res.ok) throw new Error(data.error||"Inscription impossible");
      }
      const result=await signIn("credentials",{email,password,redirect:false});
      if(result?.error) throw new Error("Email ou mot de passe incorrect");
      window.location.href=mode==="register"?"/inscription":"/profil";
    }catch(err){setError(err instanceof Error?err.message:"Une erreur est survenue"); setLoading(false);}
  }

  return <main className="auth-page"><header className="auth-header"><Link href="/" className="auth-logo">LOOK&GO</Link><Link href="/">Retour au site</Link></header><section className="auth-shell"><div className="auth-story"><p>VOTRE DRESSING PRIVÉ</p><h1>{mode==="login"?<>Heureux de vous <em>revoir.</em></>:<>Créez votre <em>profil.</em></>}</h1><span>Retrouvez vos préférences, vos looks, votre historique et votre dressing dans un seul espace.</span></div><div className="auth-panel"><div className="auth-tabs"><button onClick={()=>{setMode("login");setError("")}} className={mode==="login"?"active":""}>Connexion</button><button onClick={()=>{setMode("register");setError("")}} className={mode==="register"?"active":""}>Inscription</button></div><button className="google-button" onClick={()=>signIn("google",{callbackUrl:"/profil"})}><span className="google-g">G</span> Continuer avec Google</button><div className="auth-separator"><span/>ou par email<span/></div><form onSubmit={submit}>{mode==="register"&&<label>Nom ou pseudo<input name="name" required minLength={2} placeholder="Votre nom ou pseudo"/></label>}<label>Email<input name="email" type="email" required autoComplete="email" placeholder="vous@exemple.fr"/></label><label>Mot de passe<input name="password" type="password" required minLength={8} autoComplete={mode==="login"?"current-password":"new-password"} placeholder="8 caractères minimum"/></label>{error&&<div className="auth-error">{error}</div>}<button className="auth-submit" disabled={loading}>{loading?"Chargement…":mode==="login"?"Se connecter →":"Créer mon compte →"}</button></form><p className="auth-privacy">En continuant, vous acceptez que Look&Go utilise les données nécessaires à la création et à la gestion de votre compte. Les photos de profil restent séparées de l’authentification et seront gérées dans votre espace privé.</p></div></section></main>
}
