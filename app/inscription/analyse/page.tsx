"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BetaProfile, readBetaProfile } from "@/lib/beta-profile";
import { readBetaMedia, saveBetaMedia, type BetaMediaKey } from "@/lib/beta-media";
import "../profile.css";
import "./analyse.css";

type Tier="signature"|"balance"|"smart";
type GenerationState={status:"idle"|"loading"|"done"|"error";url?:string;error?:string};
type VideoState={status:"idle"|"loading"|"done"|"error";url?:string;error?:string;progress?:number};

const tierMeta:Record<Tier,{name:string;tone:string;mediaKey:BetaMediaKey;videoKey:BetaMediaKey}>={
 signature:{name:"SIGNATURE",tone:"sig",mediaKey:"tryonSignature",videoKey:"videoSignature"},
 balance:{name:"ÉQUILIBRE",tone:"bal",mediaKey:"tryonBalance",videoKey:"videoBalance"},
 smart:{name:"SMART",tone:"sma",mediaKey:"tryonSmart",videoKey:"videoSmart"},
};

function dataUrlToBlob(dataUrl:string){
 const [head,data]=dataUrl.split(",");
 const type=head.match(/data:(.*?);/)?.[1]||"image/png";
 const bytes=atob(data); const array=new Uint8Array(bytes.length);
 for(let i=0;i<bytes.length;i++) array[i]=bytes.charCodeAt(i);
 return new Blob([array],{type});
}

function wait(ms:number){return new Promise(resolve=>setTimeout(resolve,ms));}

async function readJsonSafe(res:Response){
 const text=await res.text();
 if(!text) return {} as Record<string,unknown>;
 try{return JSON.parse(text) as Record<string,unknown>;}catch{
  if(res.status===413) return {error:"Vos photos sont trop volumineuses pour être envoyées. Elles vont être compressées automatiquement au prochain essai."};
  return {error:`Le serveur a renvoyé une réponse invalide (${res.status}). Réessayez dans quelques instants.`};
 }
}

async function compressImage(blob:Blob,maxDimension=1600,maxBytes=1_500_000):Promise<Blob>{
 if(blob.size<=maxBytes && blob.type==="image/jpeg") return blob;
 const bitmap=await createImageBitmap(blob);
 const scale=Math.min(1,maxDimension/Math.max(bitmap.width,bitmap.height));
 const width=Math.max(1,Math.round(bitmap.width*scale));
 const height=Math.max(1,Math.round(bitmap.height*scale));
 const canvas=document.createElement("canvas");
 canvas.width=width; canvas.height=height;
 const ctx=canvas.getContext("2d");
 if(!ctx){bitmap.close();throw new Error("Compression photo impossible sur cet appareil.");}
 ctx.drawImage(bitmap,0,0,width,height); bitmap.close();
 let quality=.86;
 let out=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Compression photo impossible")),"image/jpeg",quality));
 while(out.size>maxBytes&&quality>.5){
  quality-=.1;
  out=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Compression photo impossible")),"image/jpeg",quality));
 }
 return out;
}

export default function AnalyseStep(){
 const [p,setP]=useState<BetaProfile>({});
 const [portrait,setPortrait]=useState<Blob|null>(null);
 const [fullBody,setFullBody]=useState<Blob|null>(null);
 const [states,setStates]=useState<Record<Tier,GenerationState>>({signature:{status:"idle"},balance:{status:"idle"},smart:{status:"idle"}});
 const [videos,setVideos]=useState<Record<Tier,VideoState>>({signature:{status:"idle"},balance:{status:"idle"},smart:{status:"idle"}});
 const [globalError,setGlobalError]=useState("");

 useEffect(()=>{
  setP(readBetaProfile());
  (async()=>{
   const [portraitBlob,fullBlob]=await Promise.all([readBetaMedia("portrait"),readBetaMedia("fullBody")]);
   setPortrait(portraitBlob); setFullBody(fullBlob);
   const tiers=Object.keys(tierMeta) as Tier[];
   const imageEntries=await Promise.all(tiers.map(async tier=>[tier,await readBetaMedia(tierMeta[tier].mediaKey)] as const));
   const videoEntries=await Promise.all(tiers.map(async tier=>[tier,await readBetaMedia(tierMeta[tier].videoKey)] as const));
   const nextImages={signature:{status:"idle"},balance:{status:"idle"},smart:{status:"idle"}} as Record<Tier,GenerationState>;
   const nextVideos={signature:{status:"idle"},balance:{status:"idle"},smart:{status:"idle"}} as Record<Tier,VideoState>;
   for(const [tier,blob] of imageEntries){if(blob) nextImages[tier]={status:"done",url:URL.createObjectURL(blob)};}
   for(const [tier,blob] of videoEntries){if(blob) nextVideos[tier]={status:"done",url:URL.createObjectURL(blob)};}
   setStates(nextImages); setVideos(nextVideos);
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
  try{
   const [portraitUpload,fullUpload]=await Promise.all([compressImage(portrait),compressImage(fullBody)]);
   const form=new FormData();
   form.append("portrait",new File([portraitUpload],"portrait.jpg",{type:"image/jpeg"}));
   form.append("fullBody",new File([fullUpload],"full-body.jpg",{type:"image/jpeg"}));
   form.append("tier",tier);
   form.append("profile",JSON.stringify(p));
   const res=await fetch("/api/ai/tryon",{method:"POST",body:form});
   const data=await readJsonSafe(res);
   if(!res.ok) throw new Error(String(data.error||"Génération impossible"));
   const image=String(data.image||""); if(!image) throw new Error("Aucune image reçue");
   let blob:Blob;
   if(image.startsWith("data:")) blob=dataUrlToBlob(image); else blob=await fetch(image).then(r=>r.blob());
   await saveBetaMedia(tierMeta[tier].mediaKey,blob);
   setStates(s=>{if(s[tier].url) URL.revokeObjectURL(s[tier].url!);return {...s,[tier]:{status:"done",url:URL.createObjectURL(blob)}}});
  }catch(error){setStates(s=>({...s,[tier]:{status:"error",error:error instanceof Error?error.message:"Erreur IA"}}));}
 }

 async function generateAll(){for(const tier of ["signature","balance","smart"] as Tier[]) await generateTier(tier);}

 async function generateVideo(tier:Tier){
  const imageBlob=await readBetaMedia(tierMeta[tier].mediaKey);
  if(!imageBlob){setVideos(v=>({...v,[tier]:{status:"error",error:"Générez d’abord ce look photo."}}));return;}
  setVideos(v=>({...v,[tier]:{status:"loading",progress:0}}));
  try{
   const videoInput=await compressImage(imageBlob,1536,1_800_000);
   const form=new FormData();
   form.append("image",new File([videoInput],`${tier}-tryon.jpg`,{type:"image/jpeg"}));
   form.append("tier",tier);
   const create=await fetch("/api/ai/runway",{method:"POST",body:form});
   const created=await readJsonSafe(create);
   if(!create.ok) throw new Error(String(created.error||"Création du défilé impossible"));
   const id=String(created.id||""); if(!id) throw new Error("Aucun identifiant vidéo reçu");
   let completed=false;
   for(let attempt=0;attempt<48;attempt++){
    await wait(5000);
    const statusRes=await fetch(`/api/ai/runway?id=${encodeURIComponent(id)}`,{cache:"no-store"});
    const status=await readJsonSafe(statusRes);
    if(!statusRes.ok) throw new Error(String(status.error||"Suivi du défilé impossible"));
    setVideos(v=>({...v,[tier]:{...v[tier],status:"loading",progress:Number(status.progress||0)}}));
    if(status.status==="failed") throw new Error(String(status.error||"La génération vidéo a échoué"));
    if(status.status==="completed"){completed=true;break;}
   }
   if(!completed) throw new Error("Le défilé prend plus de temps que prévu. Réessayez dans quelques instants.");
   const content=await fetch(`/api/ai/runway/content?id=${encodeURIComponent(id)}`,{cache:"no-store"});
   if(!content.ok){const data=await readJsonSafe(content);throw new Error(String(data.error||"Impossible de récupérer la vidéo"));}
   const blob=await content.blob();
   await saveBetaMedia(tierMeta[tier].videoKey,blob);
   setVideos(v=>{if(v[tier].url) URL.revokeObjectURL(v[tier].url!);return {...v,[tier]:{status:"done",progress:100,url:URL.createObjectURL(blob)}}});
  }catch(error){setVideos(v=>({...v,[tier]:{status:"error",error:error instanceof Error?error.message:"Erreur vidéo"}}));}
 }

 return <main className="analysis-page"><header className="profile-header"><Link href="/" className="profile-logo">LOOK&GO</Link><span>TRY-ON & DÉFILÉ · 03/03</span></header><section className="analysis-shell"><div className="analysis-hero"><p className="profile-eyebrow">VOTRE PROFIL BÊTA EST PRÊT</p><h1>{p.pseudo?`${p.pseudo}, `:""}voyez maintenant vos <em>3 directions sur vous.</em></h1><p>Look&Go utilise votre portrait comme référence d’identité et votre photo plein pied comme référence de silhouette. Chaque look peut ensuite être animé en défilé vertical.</p></div><div className="analysis-grid"><article><span>01</span><strong>Taille</strong><p>{p.topSize||"—"} haut · {p.bottomSize||"—"} bas · {p.shoeSize||"—"} chaussures</p></article><article><span>02</span><strong>Couleurs</strong><p>{colors}</p></article><article><span>03</span><strong>Style</strong><p>{style}</p></article><article><span>04</span><strong>Budget</strong><p>{budget} € · priorité {p.budgetMode||"Équilibre"}</p></article></div><div className="result-head"><div><p className="profile-eyebrow">VOS VISUALISATIONS</p><h2>Vous.<br/><em>Trois directions.</em></h2></div><div><p>Générez vos looks photo, puis choisissez celui ou ceux que vous voulez voir en mouvement.</p><button className="profile-submit" type="button" onClick={generateAll} disabled={!portrait||!fullBody||Object.values(states).some(s=>s.status==="loading")}>Générer mes 3 looks →</button></div></div>{globalError&&<div className="profile-required">{globalError}</div>}<div className="result-grid">{looks.map(l=>{const meta=tierMeta[l.tier];const state=states[l.tier];const video=videos[l.tier];return <article className={`result-card ${meta.tone}`} key={l.tier}><span className="result-kicker">TRY-ON · BÊTA</span><h3>{meta.name}</h3><div className="result-price">{l.price}</div>{state.url?<img src={state.url} alt={`Visualisation ${meta.name} de ${p.pseudo||"l’utilisateur"}`} style={{width:"100%",aspectRatio:"2/3",objectFit:"cover",margin:"18px 0",borderRadius:18}}/>:<div style={{aspectRatio:"2/3",margin:"18px 0",borderRadius:18,display:"grid",placeItems:"center",background:"rgba(255,255,255,.08)",padding:24,textAlign:"center"}}>{state.status==="loading"?"Préparation et génération du look…":"Aucune génération pour le moment"}</div>}{video.url&&<video src={video.url} controls playsInline preload="metadata" style={{width:"100%",aspectRatio:"9/16",objectFit:"cover",margin:"0 0 18px",borderRadius:18,background:"#000"}}/>}<p>{l.text}</p><div className="result-tags"><span>{style}</span><span>{colors}</span><span>{p.topSize||"Taille"}</span></div>{state.status==="error"&&<p className="profile-required">{state.error}</p>}{video.status==="error"&&<p className="profile-required">{video.error}</p>}<button className="profile-submit" type="button" onClick={()=>generateTier(l.tier)} disabled={state.status==="loading"||video.status==="loading"||!portrait||!fullBody}>{state.status==="loading"?"Génération…":state.url?"Régénérer ce look":"Générer ce look"} →</button><button className="profile-submit" type="button" onClick={()=>generateVideo(l.tier)} disabled={!state.url||video.status==="loading"}>{video.status==="loading"?`Création du défilé… ${Math.round(video.progress||0)}%`:video.url?"Régénérer mon défilé":"Créer mon défilé"} →</button></article>})}</div><div className="analysis-final"><div><span>WORKFLOW COMPLET</span><p>Photos de référence → Try-On → validation visuelle → défilé → sauvegarde dans votre profil.</p></div><Link href="/profil">Ouvrir mon espace <span>→</span></Link></div><p className="analysis-truth">BÊTA IA : les images et vidéos restent des visualisations génératives. Elles ne garantissent pas une reproduction parfaite ni l’existence commerciale exacte des vêtements affichés.</p></section></main>
}
