"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BetaProfile, readBetaProfile } from "@/lib/beta-profile";
import { readBetaMedia, saveBetaMedia, type BetaMediaKey } from "@/lib/beta-media";
import "../profile.css";
import "./analyse.css";

type Tier="signature"|"balance"|"smart";
type GenerationState={status:"idle"|"loading"|"done"|"error";url?:string;error?:string};

const tierMeta:Record<Tier,{name:string;tone:string;mediaKey:BetaMediaKey}>={
 signature:{name:"SIGNATURE",tone:"sig",mediaKey:"tryonSignature"},
 balance:{name:"ÉQUILIBRE",tone:"bal",mediaKey:"tryonBalance"},
 smart:{name:"SMART",tone:"sma",mediaKey:"tryonSmart"},
};

function dataUrlToBlob(dataUrl:string){
 const [head,data]=dataUrl.split(",");
 const type=head.match(/data:(.*?);/)?.[1]||"image/png";
 const bytes=atob(data); const array=new Uint8Array(bytes.length);
 for(let i=0;i<bytes.length;i++) array[i]=bytes.charCodeAt(i);
 return new Blob([array],{type});
}

export default function AnalyseStep(){
 const [p,setP]=useState<BetaProfile>({});
 const [portrait,setPortrait]=useState<Blob|null>(null);
 const [fullBody,setFullBody]=useState<Blob|null>(null);
 const [states,setStates]=useState<Record<Tier,GenerationState>>({signature:{status:"idle"},balance:{status:"idle"},smart:{status:"idle"}});
 const [globalError,setGlobalError]=useState("");

 useEffect(()=>{
  setP(readBetaProfile());
  (async()=>{
   const [portraitBlob,fullBlob]=await Promise.all([readBetaMedia("portrait"),readBetaMedia("fullBody")]);
   setPortrait(portraitBlob); setFullBody(fullBlob);
   const entries=await Promise.all((Object.keys(tierMeta) as Tier[]).map(async tier=>[tier,await readBetaMedia(tierMeta[tier].mediaKey)] as const));
   const next={signature:{status:"idle"},balance:{status:"idle"},smart:{status:"idle"}} as Record<Tier,GenerationState>;
   for(const [tier,blob] of entries){if(blob) next[tier]={status:"done",url:URL.createObjectURL(blob)};}
   setStates(next);
  })();
 },[]);

 const budget=Math.max(60,Number(p.budget||200));
 const looks=useMemo(()=>[
  {tier:"signature" as Tier,price:`≈ ${Math.round(budget*1.8)}–${Math.round(budget*2.4)} €`,text:"Direction premium, plus habillée et plus affirmée."},
  {tier:"balance" as Tier,price:`≈ ${Math.round(budget*.85)}–${Math.round(budget*1.1)} €`,text:"Direction contemporaine avec équilibre style / budget."},
  {tier:"smart" as Tier,price:`≈ ${Math.round(budget*.45)}–${Math.round(budget*.65)} €`,text:"Direction accessible qui conserve l’intention stylistique."},
 ],[budget]);
 const style=(p.styles||[]).slice(0,2).join(" · ")||"Style à préciser"; const colors=(p.likedColors||[]).slice(0,2).join(" · ")||"Couleurs libres";

 async function generateTier(tier:Tier){
  if(!portrait||!fullBody){setGlobalError("Les deux photos de référence sont nécessaires. Retournez dans votre profil pour les ajouter.");return;}
  setGlobalError(""); setStates(s=>({...s,[tier]:{status:"loading"}}));
  const form=new FormData();
  form.append("portrait",new File([portrait],"portrait.jpg",{type:portrait.type||"image/jpeg"}));
  form.append("fullBody",new File([fullBody],"full-body.jpg",{type:fullBody.type||"image/jpeg"}));
  form.append("tier",tier);
  form.append("profile",JSON.stringify(p));
  try{
   const res=await fetch("/api/ai/tryon",{method:"POST",body:form});
   const data=await res.json();
   if(!res.ok) throw new Error(data.error||"Génération impossible");
   const image=String(data.image||""); if(!image) throw new Error("Aucune image reçue");
   let blob:Blob;
   if(image.startsWith("data:")) blob=dataUrlToBlob(image); else blob=await fetch(image).then(r=>r.blob());
   await saveBetaMedia(tierMeta[tier].mediaKey,blob);
   setStates(s=>{if(s[tier].url) URL.revokeObjectURL(s[tier].url!);return {...s,[tier]:{status:"done",url:URL.createObjectURL(blob)}}});
  }catch(error){setStates(s=>({...s,[tier]:{status:"error",error:error instanceof Error?error.message:"Erreur IA"}}));}
 }

 async function generateAll(){
  for(const tier of ["signature","balance","smart"] as Tier[]) await generateTier(tier);
 }

 return <main className="analysis-page"><header className="profile-header"><Link href="/" className="profile-logo">LOOK&GO</Link><span>GÉNÉRATION IA · 03/03</span></header><section className="analysis-shell"><div className="analysis-hero"><p className="profile-eyebrow">VOTRE PROFIL BÊTA EST PRÊT</p><h1>{p.pseudo?`${p.pseudo}, `:""}voyez maintenant vos <em>3 directions sur vous.</em></h1><p>Look&Go utilise votre portrait comme référence d’identité et votre photo plein pied comme référence de silhouette. GPT Image 2 génère une visualisation pour Signature, Équilibre et Smart.</p></div><div className="analysis-grid"><article><span>01</span><strong>Taille</strong><p>{p.topSize||"—"} haut · {p.bottomSize||"—"} bas · {p.shoeSize||"—"} chaussures</p></article><article><span>02</span><strong>Couleurs</strong><p>{colors}</p></article><article><span>03</span><strong>Style</strong><p>{style}</p></article><article><span>04</span><strong>Budget</strong><p>{budget} € · priorité {p.budgetMode||"Équilibre"}</p></article></div><div className="result-head"><div><p className="profile-eyebrow">VOS VISUALISATIONS IA</p><h2>Vous.<br/><em>Trois directions.</em></h2></div><div><p>Les images sont des visualisations de style IA. Elles ne représentent pas encore des références produits exactes tant que les catalogues marchands ne sont pas raccordés.</p><button className="profile-submit" type="button" onClick={generateAll} disabled={!portrait||!fullBody||Object.values(states).some(s=>s.status==="loading")}>Générer mes 3 looks IA →</button></div></div>{globalError&&<div className="profile-required">{globalError}</div>}<div className="result-grid">{looks.map(l=>{const meta=tierMeta[l.tier];const state=states[l.tier];return <article className={`result-card ${meta.tone}`} key={l.tier}><span className="result-kicker">GPT IMAGE 2 · BÊTA</span><h3>{meta.name}</h3><div className="result-price">{l.price}</div>{state.url?<img src={state.url} alt={`Visualisation IA ${meta.name} de ${p.pseudo||"l’utilisateur"}`} style={{width:"100%",aspectRatio:"2/3",objectFit:"cover",margin:"18px 0",borderRadius:18}}/>:<div style={{aspectRatio:"2/3",margin:"18px 0",borderRadius:18,display:"grid",placeItems:"center",background:"rgba(255,255,255,.08)",padding:24,textAlign:"center"}}>{state.status==="loading"?"Génération OpenAI en cours…":"Aucune génération pour le moment"}</div>}<p>{l.text}</p><div className="result-tags"><span>{style}</span><span>{colors}</span><span>{p.topSize||"Taille"}</span></div>{state.status==="error"&&<p className="profile-required">{state.error}</p>}<button className="profile-submit" type="button" onClick={()=>generateTier(l.tier)} disabled={state.status==="loading"||!portrait||!fullBody}>{state.status==="loading"?"Génération…":state.url?"Régénérer ce look":"Générer ce look"} →</button></article>})}</div><div className="analysis-final"><div><span>PROCHAINE ÉTAPE</span><p>Une fois un look photo validé, le mode Défilé utilisera cette image comme frame de départ pour l’animation vidéo.</p></div><Link href="/profil">Ouvrir mon espace <span>→</span></Link></div><p className="analysis-truth">BÊTA IA : les visuels sont générés par GPT Image 2 à partir de vos références. Ils restent des visualisations et ne garantissent pas une reproduction parfaite ni l’existence commerciale exacte des vêtements affichés.</p></section></main>
}
