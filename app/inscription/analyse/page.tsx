"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BetaProfile, readBetaProfile } from "@/lib/beta-profile";
import "../profile.css";
import "./analyse.css";

export default function AnalyseStep(){
 const [p,setP]=useState<BetaProfile>({});
 useEffect(()=>setP(readBetaProfile()),[]);
 const budget=Math.max(60,Number(p.budget||200));
 const looks=[
  {name:"SIGNATURE",price:`≈ ${Math.round(budget*1.8)}–${Math.round(budget*2.4)} €`,text:"Pièces premium et fortes, avec priorité au style et à la qualité perçue.",tone:"sig"},
  {name:"ÉQUILIBRE",price:`≈ ${Math.round(budget*.85)}–${Math.round(budget*1.1)} €`,text:"Une composition maîtrisée avec un bon équilibre entre allure, qualité et budget.",tone:"bal"},
  {name:"SMART",price:`≈ ${Math.round(budget*.45)}–${Math.round(budget*.65)} €`,text:"Une version accessible qui conserve l’intention stylistique avec un budget serré.",tone:"sma"},
 ];
 const style=(p.styles||[]).slice(0,2).join(" · ")||"Style à préciser"; const colors=(p.likedColors||[]).slice(0,2).join(" · ")||"Couleurs libres";
 return <main className="analysis-page"><header className="profile-header"><Link href="/" className="profile-logo">LOOK&GO</Link><span>ANALYSE & PREMIER LOOK · 03/03</span></header><section className="analysis-shell"><div className="analysis-hero"><p className="profile-eyebrow">VOTRE PROFIL BÊTA EST PRÊT</p><h1>{p.pseudo?`${p.pseudo}, `:""}voici vos <em>3 directions de look.</em></h1><p>Le MVP combine vos tailles, styles, couleurs et budget pour produire trois niveaux cohérents. Les prix sont des enveloppes calculées pour le test, pas des prix marchands en direct.</p></div><div className="analysis-grid"><article><span>01</span><strong>Taille</strong><p>{p.topSize||"—"} haut · {p.bottomSize||"—"} bas · {p.shoeSize||"—"} chaussures</p></article><article><span>02</span><strong>Couleurs</strong><p>{colors}</p></article><article><span>03</span><strong>Style</strong><p>{style}</p></article><article><span>04</span><strong>Budget</strong><p>{budget} € · priorité {p.budgetMode||"Équilibre"}</p></article></div><div className="result-head"><div><p className="profile-eyebrow">VOS 3 PREMIÈRES DIRECTIONS</p><h2>Un style.<br/><em>Trois budgets.</em></h2></div><p>Ces recommandations sont personnalisées à partir de votre saisie bêta. Les vrais produits et liens d’achat seront ajoutés via les catalogues marchands.</p></div><div className="result-grid">{looks.map(l=><article className={`result-card ${l.tone}`} key={l.name}><span className="result-kicker">RECOMMANDATION BÊTA</span><h3>{l.name}</h3><div className="result-price">{l.price}</div><p>{l.text}</p><div className="result-tags"><span>{style}</span><span>{colors}</span><span>{p.topSize||"Taille"}</span></div><Link href="/profil">Sauvegarder dans mon espace →</Link></article>)}</div><div className="analysis-final"><div><span>MVP BÊTA ACTIF</span><p>Votre profil et vos préférences restent disponibles dans ce navigateur pour tester le parcours complet.</p></div><Link href="/profil">Ouvrir mon espace <span>→</span></Link></div><p className="analysis-truth">BÊTA : pas d’analyse biométrique réelle, pas de stock marchand temps réel et pas encore de génération Try-On réelle.</p></section></main>
}
