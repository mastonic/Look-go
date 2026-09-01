"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BetaProfile, readBetaProfile } from "@/lib/beta-profile";
import { readBetaMedia, saveBetaMedia, type BetaMediaKey } from "@/lib/beta-media";
import { readBetaMediaCloud, saveBetaHistoryCloud, uploadBetaMediaCloud } from "@/lib/firebase-beta";
import { weddingGenerationProfile, weddingRoleLabel, weddingShoppingQuery } from "@/lib/wedding";
import "../profile.css";
import "./analyse.css";

type Tier="signature"|"balance"|"smart";
type GenerationState={status:"idle"|"loading"|"done"|"error";url?:string;error?:string;silhouette?:string};
type VideoState={status:"idle"|"loading"|"done"|"error";url?:string;error?:string;progress?:number};
type ProductResult={title:string;description:string;url:string;merchant:{id:string;name:string;tier:string};directMerchantLink:boolean};
type ShoppingState={status:"idle"|"loading"|"done"|"error";results:ProductResult[];error?:string};
const tiers:[Tier,Tier,Tier]=["signature","balance","smart"];
const tierMeta:Record<Tier,{name:string;tone:string;mediaKey:BetaMediaKey;videoKey:BetaMediaKey}>={signature:{name:"SIGNATURE",tone:"sig",mediaKey:"tryonSignature",videoKey:"videoSignature"},balance:{name:"ÉQUILIBRE",tone:"bal",mediaKey:"tryonBalance",videoKey:"videoBalance"},smart:{name:"SMART",tone:"sma",mediaKey:"tryonSmart",videoKey:"videoSmart"}};
const weddingTierMeta:Record<Tier,{name:string;tone:string;mediaKey:BetaMediaKey;videoKey:BetaMediaKey}>={signature:{name:"SIGNATURE",tone:"sig",mediaKey:"weddingTryonSignature",videoKey:"weddingVideoSignature"},balance:{name:"ÉQUILIBRE",tone:"bal",mediaKey:"weddingTryonBalance",videoKey:"weddingVideoBalance"},smart:{name:"SMART",tone:"sma",mediaKey:"weddingTryonSmart",videoKey:"weddingVideoSmart"}};
function metaFor(tier:Tier,weddingMode:boolean){return weddingMode?weddingTierMeta[tier]:tierMeta[tier]}

function dataUrlToBlob(dataUrl:string){const [head,data]=dataUrl.split(",");const type=head.match(/data:(.*?);/)?.[1]||"image/png";const bytes=atob(data);const array=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)array[i]=bytes.charCodeAt(i);return new Blob([array],{type});}
function wait(ms:number){return new Promise(resolve=>setTimeout(resolve,ms));}
function timeout<T>(promise:Promise<T>,ms:number,fallback:T){return Promise.race([promise,new Promise<T>(resolve=>setTimeout(()=>resolve(fallback),ms))]);}
function telemetry(event:string,detail:Record<string,unknown>={}){void fetch("/api/client-telemetry",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event,detail}),keepalive:true}).catch(()=>{});}
async function readJsonSafe(res:Response){const text=await res.text();if(!text)return{} as Record<string,unknown>;try{return JSON.parse(text) as Record<string,unknown>;}catch{return{error:`Le serveur a renvoyé une réponse invalide (${res.status}).`};}}
function silhouetteLabel(value?:string){const labels:Record<string,string>={trousers:"pantalon",jeans:"jean",skirt:"jupe",dress:"robe",bodysuit:"body",shorts:"short",jumpsuit:"combinaison","matching set":"ensemble","tailored suit":"tailleur","shirt-and-skirt look":"chemise et jupe","layered separates":"superpositions"};return value?labels[value]||value:"tenue";}
function lookTitle(tier:Tier,silhouette?:string){const lead=silhouetteLabel(silhouette);return tier==="signature"?`${lead} Signature`:(tier==="balance"?`${lead} Équilibre`:`${lead} Smart`);}
function shoppingQuery(profile:BetaProfile,silhouette:string|undefined,weddingMode:boolean){if(weddingMode)return weddingShoppingQuery(profile,silhouetteLabel(silhouette));const garments=silhouette?[silhouetteLabel(silhouette)]:(profile.garmentTypes||[]).slice(0,2);const styles=(profile.styles||[]).slice(0,2);const colors=(profile.likedColors||[]).slice(0,2);return ["tenue",...garments,...styles,...colors].filter(Boolean).join(" ");}

async function blobToImage(blob:Blob):Promise<HTMLImageElement>{
 const url=URL.createObjectURL(blob);
 try{return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("Lecture photo impossible"));img.src=url;});}
 finally{setTimeout(()=>URL.revokeObjectURL(url),0)}
}

async function compressImage(blob:Blob,maxDimension=1600,maxBytes=1_500_000):Promise<Blob>{
 if(blob.size<=maxBytes&&blob.type==="image/jpeg")return blob;
 try{
  let source:CanvasImageSource;let width:number;let height:number;let close:undefined|(()=>void);
  if(typeof createImageBitmap==="function"){
   const bitmap=await createImageBitmap(blob);source=bitmap;width=bitmap.width;height=bitmap.height;close=()=>bitmap.close();
  }else{
   const image=await blobToImage(blob);source=image;width=image.naturalWidth;height=image.naturalHeight;
  }
  const scale=Math.min(1,maxDimension/Math.max(width,height));const w=Math.max(1,Math.round(width*scale));const h=Math.max(1,Math.round(height*scale));
  const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas indisponible");ctx.drawImage(source,0,0,w,h);close?.();
  let quality=.86;let out=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Compression impossible")),"image/jpeg",quality));
  while(out.size>maxBytes&&quality>.5){quality-=.1;out=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Compression impossible")),"image/jpeg",quality));}
  return out;
 }catch(error){telemetry("tryon_compression_fallback",{type:blob.type,size:blob.size,error:error instanceof Error?error.message:"unknown"});return blob;}
}

async function runwayFrame(blob:Blob):Promise<Blob>{
 let source:CanvasImageSource;let width:number;let height:number;let close:undefined|(()=>void);
 if(typeof createImageBitmap==="function"){const bitmap=await createImageBitmap(blob);source=bitmap;width=bitmap.width;height=bitmap.height;close=()=>bitmap.close();}
 else{const image=await blobToImage(blob);source=image;width=image.naturalWidth;height=image.naturalHeight;}
 const W=720,H=1280;const canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Préparation vidéo impossible.");ctx.fillStyle="#e8dfd2";ctx.fillRect(0,0,W,H);const scale=Math.min(W/width,H/height);const w=width*scale,h=height*scale;ctx.drawImage(source,(W-w)/2,(H-h)/2,w,h);close?.();return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Préparation vidéo impossible")),"image/png"));
}

async function localMedia(key:BetaMediaKey){try{return await readBetaMedia(key);}catch{return null;}}

function PremiumLookCard({tier,profile,state,video,price,text,style,colors,photosReady,weddingMode,onGenerate,onGenerateVideo}:{tier:Tier;profile:BetaProfile;state:GenerationState;video:VideoState;price:string;text:string;style:string;colors:string;photosReady:boolean;weddingMode:boolean;onGenerate:()=>void;onGenerateVideo:()=>void}){
 const meta=metaFor(tier,weddingMode);const [shop,setShop]=useState<ShoppingState>({status:"idle",results:[]});
 const baseBudget=Number(weddingMode?profile.wedding?.budget||profile.budget||200:profile.budget||200);const maxPrice=Math.max(30,Math.round(baseBudget*(tier==="signature"?2.4:tier==="balance"?1.1:.65)));
 const merchantLabel=shop.results[0]?.merchant.name||"SHOPPING LIVE";
 async function loadShopping(){if(!state.url)return;setShop({status:"loading",results:[]});telemetry("lookbook_shopping_load",{tier,mode:weddingMode?"wedding":"default"});try{const res=await fetch("/api/commerce/search",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({query:shoppingQuery(profile,state.silhouette,weddingMode),tier,maxPrice,topSize:profile.topSize,bottomSize:profile.bottomSize,shoeSize:profile.shoeSize,limit:4})});const data=await readJsonSafe(res);if(!res.ok)throw new Error(String(data.error||"Shopping momentanément indisponible"));const results=Array.isArray(data.results)?data.results as ProductResult[]:[];setShop({status:"done",results:results.slice(0,3)});telemetry("lookbook_shopping_success",{tier,count:results.length,mode:weddingMode?"wedding":"default"});}catch(error){const message=error instanceof Error?error.message:"Shopping momentanément indisponible";setShop({status:"error",results:[],error:message});telemetry("lookbook_shopping_failure",{tier,error:message,mode:weddingMode?"wedding":"default"});}}
 useEffect(()=>{if(state.url)void loadShopping();else setShop({status:"idle",results:[]});},[state.url]);
 return <article className={`premium-lookbook ${meta.tone}`}>
  <div className="premium-lookbook-top"><span className="premium-back">{weddingMode?"← WEDDING CONCIERGE":"← LOOK-BOOK"}</span><span className="premium-merchant">{merchantLabel}</span></div>
  <div className="premium-lookbook-title"><div><span>{weddingMode?"WEDDING TRY-ON":"TRY-ON"} · {meta.name}</span><h3>{weddingMode?"Mariage · ":""}{lookTitle(tier,state.silhouette)}</h3></div><p>{text}<br/><strong>Budget cible : {price}</strong></p></div>
  <div className="premium-lookbook-layout">
   <div className="premium-visual-column">
    <div className="premium-visual-frame">{state.url?<img src={state.url} alt={`Visualisation ${meta.name}`}/>:<div className="premium-visual-empty"><span>{state.status==="loading"?"Génération IA en cours…":photosReady?"Votre photo Try-On apparaîtra ici":"Ajoutez vos deux photos de référence"}</span></div>}</div>
    <div className="premium-visual-meta"><div className="result-tags"><span>{style}</span><span>{colors}</span><span>{profile.topSize||"Taille"}</span></div>{state.status==="error"&&<p className="profile-required">{state.error}</p>}{video.status==="error"&&<p className="profile-required">{video.error}</p>}</div>
    <div className="premium-actions">{photosReady?<button type="button" onClick={onGenerate} disabled={state.status==="loading"||video.status==="loading"}>{state.status==="loading"?"Génération…":state.url?"Régénérer ce look":"Générer ce look"}</button>:<Link href={weddingMode?"/inscription?returnTo=%2Finscription%2Fanalyse%3Fmode%3Dwedding":"/inscription?returnTo=%2Finscription%2Fanalyse"}>Ajouter mes photos</Link>}<button type="button" onClick={onGenerateVideo} disabled={!photosReady||!state.url||video.status==="loading"}>{video.status==="loading"?`Défilé… ${Math.round(video.progress||0)}%`:video.url?"Régénérer le défilé":"Créer le défilé"}</button></div>
    {video.url&&<video className="premium-video" src={video.url} controls playsInline preload="metadata"/>}
   </div>
   <aside className="premium-shopping-panel">
    <div className="premium-shopping-head"><div><span>✦ {weddingMode?"SÉLECTION MARIAGE":"SÉLECTION LOOK&GO"}</span><h4>{weddingMode?"Les pièces du jour J":"Les pièces à retrouver"}</h4></div>{state.url&&<button type="button" onClick={()=>void loadShopping()} disabled={shop.status==="loading"} aria-label="Actualiser la sélection shopping">↻</button>}</div>
    {!state.url&&<div className="premium-shopping-empty">Générez ce look pour activer sa sélection shopping.</div>}
    {state.url&&shop.status==="loading"&&<div className="premium-shopping-empty">Recherche des pièces chez nos marchands sélectionnés…</div>}
    {state.url&&shop.status==="error"&&<div className="premium-shopping-empty"><strong>Shopping indisponible pour le moment.</strong><span>{shop.error}</span><button type="button" onClick={()=>void loadShopping()}>Réessayer</button></div>}
    {shop.status==="done"&&shop.results.length===0&&<div className="premium-shopping-empty">Aucune pièce assez pertinente trouvée. Actualisez la sélection ou utilisez la recherche shopping.</div>}
    {shop.results.map((item,index)=><div className="premium-product" key={item.url}><div className="premium-product-copy"><span>{item.merchant.name.toUpperCase()} · {String(index+1).padStart(2,"0")}</span><strong>{item.title}</strong><p>{item.description}</p></div><div className="premium-product-actions"><span>Prix & stock chez le marchand</span><a href={item.url} target="_blank" rel="noopener noreferrer nofollow" onClick={()=>telemetry("lookbook_merchant_click",{tier,merchant:item.merchant.name,mode:weddingMode?"wedding":"default"})}>VOIR L’ARTICLE ↗</a></div></div>)}
    <div className="premium-shopping-total"><span>BUDGET CIBLE DU LOOK</span><strong>{price}</strong></div>
    <p className="premium-shopping-truth">{weddingMode?"Le Try-On mariage est une direction visuelle construite depuis votre brief. Les articles proposés sont des résultats marchands réels et proches du look. Prix, taille et stock sont à vérifier chez le marchand.":"Les vêtements du Try-On sont une direction visuelle. Les articles proposés sont des résultats marchands réels et proches du look, sans prétendre être une copie exacte. Prix, taille et stock sont à vérifier chez le marchand."}</p>
   </aside>
  </div>
 </article>;
}

export default function AnalyseStep(){
 const [p,setP]=useState<BetaProfile>({});
 const [weddingMode,setWeddingMode]=useState(false);
 const [portrait,setPortrait]=useState<Blob|null>(null);const [fullBody,setFullBody]=useState<Blob|null>(null);const [mediaLoading,setMediaLoading]=useState(true);
 const [states,setStates]=useState<Record<Tier,GenerationState>>({signature:{status:"idle"},balance:{status:"idle"},smart:{status:"idle"}});
 const [videos,setVideos]=useState<Record<Tier,VideoState>>({signature:{status:"idle"},balance:{status:"idle"},smart:{status:"idle"}});
 const [globalError,setGlobalError]=useState("");

 useEffect(()=>{
  const mode=typeof window!=="undefined"&&new URLSearchParams(window.location.search).get("mode")==="wedding";setWeddingMode(mode);const profile=readBetaProfile();setP(profile);let alive=true;
  void(async()=>{
   const [localPortrait,localFull]=await Promise.all([localMedia("portrait"),localMedia("fullBody")]);
   if(!alive)return;
   setPortrait(localPortrait);setFullBody(localFull);setMediaLoading(false);
   telemetry("analyse_media_local_check",{portrait:Boolean(localPortrait),fullBody:Boolean(localFull),mode:mode?"wedding":"default"});

   const restoreRemote=async(key:BetaMediaKey)=>{
    const remote=await timeout(readBetaMediaCloud(key),3500,null);
    if(remote?.blob){try{await saveBetaMedia(key,remote.blob);}catch{}return remote.blob;}return null;
   };
   if(!localPortrait){const remote=await restoreRemote("portrait");if(alive&&remote)setPortrait(remote);}
   if(!localFull){const remote=await restoreRemote("fullBody");if(alive&&remote)setFullBody(remote);}

   const ni={signature:{status:"idle"},balance:{status:"idle"},smart:{status:"idle"}} as Record<Tier,GenerationState>;
   const nv={signature:{status:"idle"},balance:{status:"idle"},smart:{status:"idle"}} as Record<Tier,VideoState>;
   for(const tier of tiers){
    const meta=metaFor(tier,mode);let image=await localMedia(meta.mediaKey);if(!image)image=await restoreRemote(meta.mediaKey);if(image)ni[tier]={status:"done",url:URL.createObjectURL(image)};
    let video=await localMedia(meta.videoKey);if(!video)video=await restoreRemote(meta.videoKey);if(video)nv[tier]={status:"done",url:URL.createObjectURL(video)};
   }
   if(alive){setStates(ni);setVideos(nv);telemetry("analyse_media_restore_complete",{portrait:Boolean(localPortrait||await localMedia("portrait")),fullBody:Boolean(localFull||await localMedia("fullBody")),mode:mode?"wedding":"default"});}
  })();
  return()=>{alive=false};
 },[]);

 const generationProfile=useMemo(()=>weddingMode?weddingGenerationProfile(p):p,[p,weddingMode]);
 const budget=Math.max(60,Number(weddingMode?p.wedding?.budget||p.budget||200:p.budget||200));
 const looks=useMemo(()=>[{tier:"signature" as Tier,price:`≈ ${Math.round(budget*1.8)}–${Math.round(budget*2.4)} €`,text:weddingMode?"Direction cérémonie premium, plus habillée et plus affirmée.":"Direction premium, plus habillée et plus affirmée."},{tier:"balance" as Tier,price:`≈ ${Math.round(budget*.85)}–${Math.round(budget*1.1)} €`,text:weddingMode?"Direction mariage contemporaine avec équilibre style / budget.":"Direction contemporaine avec équilibre style / budget."},{tier:"smart" as Tier,price:`≈ ${Math.round(budget*.45)}–${Math.round(budget*.65)} €`,text:weddingMode?"Direction mariage accessible qui conserve l’intention du brief.":"Direction accessible qui conserve l’intention stylistique."}],[budget,weddingMode]);
 const style=weddingMode?[p.wedding?.dressCode,...(p.styles||[]).slice(0,1)].filter(Boolean).join(" · ")||"Style mariage":(p.styles||[]).slice(0,2).join(" · ")||"Style à préciser";
 const colors=(weddingMode&&p.wedding?.requiredColors?.length?p.wedding.requiredColors:p.likedColors||[]).slice(0,2).join(" · ")||"Couleurs libres";const photosReady=Boolean(portrait&&fullBody);const anyLoading=Object.values(states).some(s=>s.status==="loading");const weddingReady=!weddingMode||Boolean(p.wedding?.enabled);const returnTo=weddingMode?"/inscription?returnTo=%2Finscription%2Fanalyse%3Fmode%3Dwedding":"/inscription?returnTo=%2Finscription%2Fanalyse";

 async function generateTier(tier:Tier){
  telemetry("tryon_click",{tier,photosReady,portrait:Boolean(portrait),fullBody:Boolean(fullBody),mode:weddingMode?"wedding":"default"});
  if(weddingMode&&!p.wedding?.enabled){setGlobalError("Activez d’abord votre Pack Mariage et enregistrez le brief de l’événement.");return false;}
  if(!portrait||!fullBody){setGlobalError("Ajoutez votre portrait et votre photo plein pied pour générer un look sur vous.");return false;}
  setGlobalError("");setStates(s=>({...s,[tier]:{status:"loading"}}));
  try{
   const[a,b]=await Promise.all([compressImage(portrait),compressImage(fullBody)]);
   const form=new FormData();form.append("portrait",new File([a],"portrait.jpg",{type:a.type||"image/jpeg"}));form.append("fullBody",new File([b],"full-body.jpg",{type:b.type||"image/jpeg"}));form.append("tier",tier);form.append("profile",JSON.stringify(generationProfile));
   const started=Date.now();const res=await fetch("/api/ai/tryon",{method:"POST",body:form});const data=await readJsonSafe(res);if(!res.ok)throw new Error(String(data.error||"Génération impossible"));
   const image=String(data.image||"");if(!image)throw new Error("Aucune image reçue");let blob:Blob;if(image.startsWith("data:"))blob=dataUrlToBlob(image);else{const response=await fetch(image);if(!response.ok)throw new Error("Impossible de récupérer l’image générée");blob=await response.blob();}
   const meta=metaFor(tier,weddingMode);try{await saveBetaMedia(meta.mediaKey,blob);}catch{}
   const prefix=weddingMode?`wedding-${tier}`:tier;void uploadBetaMediaCloud(meta.mediaKey,blob,`${prefix}-tryon.png`);void saveBetaHistoryCloud("tryon",{tier,mode:weddingMode?"wedding":"default",weddingRole:weddingMode?p.wedding?.role:null,weddingDate:weddingMode?p.wedding?.date:null,durationMs:Date.now()-started,success:true});
   setStates(s=>({...s,[tier]:{status:"done",url:URL.createObjectURL(blob),silhouette:String(data.silhouette||"")||undefined}}));telemetry("tryon_success",{tier,durationMs:Date.now()-started,silhouette:data.silhouette,mode:weddingMode?"wedding":"default"});return true;
  }catch(error){const message=error instanceof Error?error.message:"Erreur IA";void saveBetaHistoryCloud("tryon",{tier,mode:weddingMode?"wedding":"default",success:false,error:message});setStates(s=>({...s,[tier]:{status:"error",error:message}}));telemetry("tryon_failure",{tier,error:message,mode:weddingMode?"wedding":"default"});return false;}
 }

 async function generateAll(){
  telemetry("tryon_generate_all_click",{photosReady,mode:weddingMode?"wedding":"default"});
  if(!weddingReady){setGlobalError("Configurez votre Pack Mariage avant de générer les trois directions.");return;}
  if(!photosReady){setGlobalError("Deux photos sont obligatoires : un portrait net et une photo plein pied. Ajoutez-les pour lancer vos 3 Try-On.");return;}
  for(const tier of tiers){const ok=await generateTier(tier);if(!ok)break;}
 }

 async function generateVideo(tier:Tier){
  if(!weddingReady){setGlobalError("Configurez votre Pack Mariage avant de générer un défilé.");return;}
  if(!photosReady){setGlobalError("Vos deux photos de référence restent obligatoires pour les générations vidéo.");return;}
  const meta=metaFor(tier,weddingMode);const imageBlob=await localMedia(meta.mediaKey);if(!imageBlob){setVideos(v=>({...v,[tier]:{status:"error",error:"Générez d’abord ce look photo."}}));return;}
  setVideos(v=>({...v,[tier]:{status:"loading",progress:0}}));
  try{
   const videoInput=await runwayFrame(imageBlob);const prefix=weddingMode?`wedding-${tier}`:tier;const form=new FormData();form.append("image",new File([videoInput],`${prefix}-runway-720x1280.png`,{type:"image/png"}));form.append("tier",tier);const started=Date.now();
   const create=await fetch("/api/ai/runway",{method:"POST",body:form});const created=await readJsonSafe(create);if(!create.ok)throw new Error(String(created.error||"Création du défilé impossible"));const id=String(created.id||"");if(!id)throw new Error("Aucun identifiant vidéo reçu");
   let completed=false;for(let attempt=0;attempt<48;attempt++){await wait(5000);const statusRes=await fetch(`/api/ai/runway?id=${encodeURIComponent(id)}`,{cache:"no-store"});const status=await readJsonSafe(statusRes);if(!statusRes.ok)throw new Error(String(status.error||"Suivi du défilé impossible"));setVideos(v=>({...v,[tier]:{...v[tier],status:"loading",progress:Number(status.progress||0)}}));if(status.status==="failed")throw new Error(String(status.error||"La génération vidéo a échoué"));if(status.status==="completed"){completed=true;break;}}
   if(!completed)throw new Error("Le défilé prend plus de temps que prévu.");const content=await fetch(`/api/ai/runway/content?id=${encodeURIComponent(id)}`,{cache:"no-store"});if(!content.ok){const data=await readJsonSafe(content);throw new Error(String(data.error||"Impossible de récupérer la vidéo"));}
   const blob=await content.blob();try{await saveBetaMedia(meta.videoKey,blob);}catch{}void uploadBetaMediaCloud(meta.videoKey,blob,`${prefix}-runway.mp4`);void saveBetaHistoryCloud("runway",{tier,mode:weddingMode?"wedding":"default",durationMs:Date.now()-started,success:true});setVideos(v=>({...v,[tier]:{status:"done",progress:100,url:URL.createObjectURL(blob)}}));telemetry("runway_success",{tier,durationMs:Date.now()-started,mode:weddingMode?"wedding":"default"});
  }catch(error){const message=error instanceof Error?error.message:"Erreur vidéo";void saveBetaHistoryCloud("runway",{tier,mode:weddingMode?"wedding":"default",success:false,error:message});setVideos(v=>({...v,[tier]:{status:"error",error:message}}));telemetry("runway_failure",{tier,error:message,mode:weddingMode?"wedding":"default"});}
 }

 return <main className="analysis-page"><header className="profile-header"><Link href="/" className="profile-logo">LOOK&GO</Link><span>{weddingMode?"WEDDING CONCIERGE · TRY-ON":"TRY-ON & DÉFILÉ · 03/03"}</span></header><section className="analysis-shell"><div className="analysis-hero"><p className="profile-eyebrow">{weddingMode?"PACK MARIAGE · WEDDING CONCIERGE":"VOTRE PROFIL BÊTA EST PRÊT"}</p><h1>{p.pseudo?`${p.pseudo}, `:""}{weddingMode?<>préparez vos <em>3 directions pour le jour J.</em></>:<>voyez maintenant vos <em>3 directions sur vous.</em></>}</h1><p>{weddingMode?"Look&Go réutilise votre profil, vos tailles, votre portrait et votre photo plein pied. Le brief mariage pilote la tenue, le contexte, les couleurs, le budget et la recherche shopping sans écraser vos looks quotidiens.":"Look&Go utilise votre portrait comme référence d’identité et votre photo plein pied comme référence de silhouette. Les deux photos sont obligatoires pour toute génération photo ou vidéo."}</p></div>
 {weddingMode?<div className="analysis-grid"><article><span>01</span><strong>Rôle</strong><p>{weddingRoleLabel(p.wedding?.role)}</p></article><article><span>02</span><strong>Événement</strong><p>{p.wedding?.date||"Date à définir"} · {p.wedding?.location||"Lieu à définir"}</p></article><article><span>03</span><strong>Dress code</strong><p>{p.wedding?.dressCode||style}</p></article><article><span>04</span><strong>Budget look</strong><p>{budget} € · {p.wedding?.venue||"cadre libre"}</p></article></div>:<div className="analysis-grid"><article><span>01</span><strong>Taille</strong><p>{p.topSize||"—"} haut · {p.bottomSize||"—"} bas · {p.shoeSize||"—"} chaussures</p></article><article><span>02</span><strong>Couleurs</strong><p>{colors}</p></article><article><span>03</span><strong>Style</strong><p>{style}</p></article><article><span>04</span><strong>Budget</strong><p>{budget} € · priorité {p.budgetMode||"Équilibre"}</p></article></div>}
 {weddingMode&&!p.wedding?.enabled&&<div className="profile-required">Votre Pack Mariage n’est pas encore activé. <Link href="/mariage">Créer mon brief mariage →</Link></div>}
 {weddingMode&&p.wedding?.enabled&&<div className="photo-gate ready"><div><span className="photo-gate-kicker">BRIEF MARIAGE ACTIF</span><h2>{weddingRoleLabel(p.wedding.role)} · {p.wedding.dressCode||"direction libre"}</h2><p>{p.wedding.date} · {p.wedding.location} · couleurs {(p.wedding.requiredColors||[]).join(" · ")||"libres"}</p></div><Link href="/mariage" className="photo-gate-secondary">Modifier le brief</Link></div>}
 <div className={`photo-gate ${photosReady?"ready":"missing"}`}><div><span className="photo-gate-kicker">PHOTOS DE RÉFÉRENCE</span><h2>{mediaLoading?"Vérification locale…":photosReady?"Vos deux photos sont prêtes.":"Deux photos sont nécessaires pour vous voir dans les looks."}</h2><p>Portrait : {portrait?"✓ enregistré":"manquant"} · Plein pied : {fullBody?"✓ enregistré":"manquant"}</p></div>{!mediaLoading&&!photosReady&&<Link href={returnTo} className="photo-gate-action">Ajouter / remplacer mes photos →</Link>}{photosReady&&<Link href={returnTo} className="photo-gate-secondary">Remplacer mes photos</Link>}</div>
 <div className="result-head"><div><p className="profile-eyebrow">{weddingMode?"VOTRE LOOK-BOOK MARIAGE":"VOTRE LOOK-BOOK PRIVÉ"}</p><h2>{weddingMode?<>Le jour J.<br/><em>Essayez puis retrouvez.</em></>:<>Vous.<br/><em>Essayez puis retrouvez.</em></>}</h2></div><div><p>{weddingMode?"Chaque direction mariage devient une fiche dédiée : votre Try-On, puis une sélection Miyami de pièces réelles proches du brief, sans écraser vos trois looks habituels.":"Chaque photo générée devient maintenant une fiche Look&Go premium : votre Try-On à gauche, puis une sélection shopping réelle et proche de la direction visuelle à droite."}</p>{photosReady&&weddingReady?<button className="profile-submit" type="button" onClick={generateAll} disabled={anyLoading}>{anyLoading?"Génération en cours…":weddingMode?"Générer mes 3 looks mariage →":"Générer mes 3 looks sur moi →"}</button>:weddingMode&&!weddingReady?<Link href="/mariage" className="profile-submit analysis-link-button">Configurer mon Pack Mariage →</Link>:<Link href={returnTo} className="profile-submit analysis-link-button">Ajouter mes 2 photos pour générer →</Link>}</div></div>
 {globalError&&<div className="profile-required">{globalError}</div>}
 <div className="premium-lookbook-stack">{looks.map(l=><PremiumLookCard key={l.tier} tier={l.tier} profile={generationProfile} state={states[l.tier]} video={videos[l.tier]} price={l.price} text={l.text} style={style} colors={colors} photosReady={photosReady} weddingMode={weddingMode} onGenerate={()=>void generateTier(l.tier)} onGenerateVideo={()=>void generateVideo(l.tier)}/>)}</div>
 <div className="analysis-final"><div><span>{weddingMode?"WORKFLOW WEDDING CONCIERGE":"WORKFLOW COMPLET"}</span><p>{weddingMode?"Brief mariage → photos existantes → 3 Try-On dédiés → shopping Miyami → défilé → sauvegarde séparée dans votre profil.":"Photos de référence → Try-On → fiche Look-Book → sélection shopping réelle → défilé → sauvegarde dans votre profil."}</p></div><Link href={weddingMode?"/mariage":"/profil"}>{weddingMode?"Ouvrir mon Pack Mariage":"Ouvrir mon espace"} <span>→</span></Link></div><p className="analysis-truth">BÊTA IA : les images et vidéos restent des visualisations génératives. Elles ne garantissent pas une reproduction parfaite ni l’existence commerciale exacte des vêtements affichés.</p></section></main>;
}
