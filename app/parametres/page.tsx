"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {readBetaProfile} from "@/lib/beta-profile";
import "./settings.css";

type Provider={id:string;label:string;enabled:boolean;configured:boolean;capabilities:string[]};
const ADMIN="rigahludovic@gmail.com";
export default function SettingsPage(){const [allowed,setAllowed]=useState<boolean|null>(null);const [providers,setProviders]=useState<Provider[]>([]);
 useEffect(()=>{const ok=(readBetaProfile().email||"").trim().toLowerCase()===ADMIN;setAllowed(ok);if(ok)fetch("/api/admin/ai").then(r=>r.json()).then(d=>setProviders(d.providers||[])).catch(()=>{});},[]);
 if(allowed===null)return <main className="settings-page"><p>Vérification…</p></main>;
 if(!allowed)return <main className="settings-page"><section className="settings-denied"><span>ACCÈS ADMIN</span><h1>Accès réservé.</h1><p>Cette console est disponible uniquement pour l’administrateur Look&Go.</p><Link href="/profil">Retour au profil</Link></section></main>;
 return <main className="settings-page"><header><Link href="/profil">← Profil</Link><strong>LOOK&GO · ADMIN</strong></header><section className="settings-shell"><p className="eyebrow">CENTRE DE CONTRÔLE IA</p><h1>Moteurs & routage</h1><p className="intro">Visualisez les moteurs configurés et actifs. Les clés restent côté serveur et ne sont jamais affichées dans le navigateur.</p><div className="provider-grid">{providers.map(p=><article className="provider-card" key={p.id}><div className="provider-top"><div><span>{p.configured?"CONFIGURÉ":"CLÉ MANQUANTE"}</span><h2>{p.label}</h2></div><div className={`status ${p.enabled&&p.configured?"on":"off"}`}>{p.enabled&&p.configured?"ACTIF":"INACTIF"}</div></div><div className="caps">{p.capabilities.map(c=><span key={c}>{c}</span>)}</div><label>Clé API<input value={p.configured?"••••••••••••••••":"Non configurée"} readOnly/></label><p>{p.enabled?"Le moteur peut être sélectionné par le routeur lorsqu’il est configuré.":"Ce moteur est désactivé côté serveur."}</p></article>)}</div><section className="routing"><h2>Ordre de secours</h2><div><strong>Image / Try-On</strong><p>OpenAI → Google → Higgsfield</p></div><div><strong>Vidéo</strong><p>Higgsfield → Google → OpenAI</p></div><div><strong>Styliste</strong><p>Claude → OpenAI → Google</p></div><small>Le fallback automatique sera utilisé uniquement pour les connecteurs réellement configurés et compatibles. Les secrets se modifient dans l’environnement serveur sécurisé.</small></section></section></main>}
