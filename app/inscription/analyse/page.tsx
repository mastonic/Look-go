"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BetaProfile, readBetaProfile } from "@/lib/beta-profile";
import { readBetaMedia, saveBetaMedia, type BetaMediaKey } from "@/lib/beta-media";
import { readBetaMediaCloud, saveBetaHistoryCloud, uploadBetaMediaCloud } from "@/lib/firebase-beta";
import { applyLookGoWatermark } from "@/lib/lookgo-watermark";
import type { GeneratedLookShopping, LookProduct } from "@/types/look-shopping";
import "../profile.css";
import "./analyse.css";

type Tier="signature"|"balance"|"smart";
type GenerationState={status:"idle"|"loading"|"done"|"error";url?:string;error?:string;silhouette?:string};
type VideoState={status:"idle"|"loading"|"done"|"error";url?:string;error?:string;progress?:number};
type ShoppingState={status:"idle"|"loading"|"done"|"error";data?:GeneratedLookShopping;error?:string};
type CommerceResult={title:string;description?:string;url:string;merchant:{id:string;name:string;tier:string};directMerchantLink?:boolean};
const tiers:[Tier,Tier,Tier]=["signature","balance","smart"];
const tierMeta:Record<Tier,{name:string;tone:string;mediaKey:BetaMediaKey;videoKey:BetaMediaKey}>={signature:{name:"SIGNATURE",tone:"sig",mediaKey:"tryonSignature",videoKey:"videoSignature"},balance:{name:"ÉQUILIBRE",tone:"bal",mediaKey:"tryonBalance",videoKey:"videoBalance"},smart:{name:"SMART",tone:"sma",mediaKey:"tryonSmart",videoKey:"videoSmart"}};

function dataUrlToBlob(dataUrl:string){const [head,data]=dataUrl.split(",");const type=head.match(/data:(.*?);/)?.[1]||"image/png";const bytes=atob(data);const array=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)array[i]=bytes.charCodeAt(i);return new Blob([array],{type});}
function wait(ms:number){return new Promise(resolve=>setTimeout(resolve,ms));}
function timeout<T>(promise:Promise<T>,ms:number,fallback:T){return Promise.race([promise,new Promise<T>(resolve=>setTimeout(()=>resolve(fallback),ms))]);}
function telemetry(event:string,detail:Record<string,unknown>={}){void fetch("/api/client-telemetry",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event,detail}),keepalive:true}).catch(()=>{});}
async function readJsonSafe(res:Response){const text=await res.text();if(!text)return{} as Record<string,unknown>;try{return JSON.parse(text) as Record<string,unknown>;}catch{return{error:`Le serveur a renvoyé une réponse invalide (${res.status}).`};}}
function silhouetteLabel(value?:string){const raw=String(value||"").trim();const lower=raw.toLowerCase();const labels:Record<string,string>={trousers:"Pantalon",pantalon:"Pantalon",jeans:"Jean",jean:"Jean",skirt:"Jupe",jupe:"Jupe",dress:"Robe",robe:"Robe",bodysuit:"Body",body:"Body",shorts:"Short",short:"Short",jumpsuit:"Combinaison",combinaison:"Combinaison","matching set":"Ensemble",ensemble:"Ensemble","tailored suit":"Tailleur",tailleur:"Tailleur",costume:"Costume",shirt:"Chemise",chemise:"Chemise",top:"Top",maille:"Maille",veste:"Veste",manteau:"Manteau"};return labels[lower]||raw||"Pièce principale"}
function fallbackSilhouette(profile:BetaProfile,tier:Tier){const items=profile.garmentTypes||[];const offset=tier==="signature"?0:tier==="balance"?1:2;return items.length?items[offset%items.length]:"tenue"}

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

function ShoppingSection({tier,state,canLoad,onLoad}:{tier:Tier;state:ShoppingState;canLoad:boolean;onLoad:()=>void}){
 const products=state.data?.products||[];
 return <section style={{marginTop:24,paddingTop:22,borderTop:"1px solid rgba(255,255,255,.14)"}}><span className="result-kicker">LES PIÈCES DE CE LOOK</span><p style={{fontSize:13,opacity:.78,margin:"10px 0 16px"}}>Look&Go n’affiche ici que des pages marchandes réellement trouvées et revalidées. Tant qu’une correspondance exacte n’est pas prouvée, elle est présentée comme similaire.</p>{state.status==="loading"&&<div className="result-empty" style={{minHeight:90}}>Recherche et validation des pages marchandes…</div>}{products.map(product=><article key={product.id} style={{padding:"14px 0",borderBottom:"1px solid rgba(255,255,255,.1)"}}><span style={{fontSize:10,letterSpacing:".12em",opacity:.72}}>{product.matchType==="exact"?"ARTICLE DU LOOK":"PIÈCE SIMILAIRE DISPONIBLE"}</span><strong style={{display:"block",fontSize:16,margin:"5px 0"}}>{product.category}</strong><p style={{fontSize:13,margin:"0 0 8px"}}>{product.name}{product.merchant?` · ${product.merchant}`:""}</p>{typeof product.price==="number"&&<p style={{fontSize:14,margin:"0 0 8px"}}>{product.price.toLocaleString("fr-FR",{style:"currency",currency:product.currency||"EUR"})}</p>}{product.productUrl&&<a href={product.productUrl} target="_blank" rel="noopener noreferrer nofollow" style={{fontSize:13,textDecoration:"underline",textUnderlineOffset:4}}>Voir l’article ↗</a>}</article>)}{state.status==="done"&&products.length>0&&<p style={{fontSize:12,opacity:.72,margin:"14px 0 0"}}>Total indicatif non affiché : les prix ne sont pas considérés comme vérifiés par le moteur actuel.</p>}{state.status==="error"&&<div className="profile-required" style={{marginTop:12}}>{state.error}</div>}{canLoad&&state.status!=="loading"&&<button className="profile-submit" type="button" onClick={onLoad} style={{marginTop:16}}>{products.length?"Actualiser les pièces similaires":"Rechercher des pièces similaires"} →</button>}</section>
}

export default function AnalyseStep(){
 const [p,setP]=useState<BetaProfile>({});
 const [portrait,setPortrait]=useState<Blob|null>(null);const [fullBody,setFullBody]=useState<Blob|null>(null);const [mediaLoading,setMediaLoading]=useState(true);
 const [states,setStates]=useState<Record<Tier,GenerationState>>({signature:{status:"idle"},balance:{status:"idle"},smart:{status:"idle"}});
 const [videos,setVideos]=useState<Record<Tier,VideoState>>({signature:{status:"idle"},balance:{status:"idle"},smart:{status:"idle"}});
 const [shopping,setShopping]=useState<Record<Tier,ShoppingState>>({signature:{status:"idle"},balance:{status:"idle"},smart:{status:"idle"}});
 const [globalError,setGlobalError]=useState("");

 useEffect(()=>{
  setP(readBetaProfile());let alive=true;
  void(async()=>{
   const [localPortrait,localFull]=await Promise.all([localMedia("portrait"),localMedia("fullBody")]);
   if(!alive)return;
   setPortrait(localPortrait);setFullBody(localFull);setMediaLoading(false);
   telemetry("analyse_media_local_check",{portrait:Boolean(localPortrait),fullBody:Boolean(localFull)});

   const restoreRemote=async(key:BetaMediaKey)=>{
    const remote=await timeout(readBetaMediaCloud(key),3500,null);
    if(remote?.blob){try{await saveBetaMedia(key,remote.blob);}catch{}return remote.blob;}return null;
   };
   if(!localPortrait){const remote=await restoreRemote("portrait");if(alive&&remote)setPortrait(remote);}
   if(!localFull){const remote=await restoreRemote("fullBody");if(alive&&remote)setFullBody(remote);}

   const ni={signature:{status:"idle"},balance:{status:"idle"},smart:{status:"idle"}} as Record<Tier,GenerationState>;
   const nv={signature:{status:"idle"},balance:{status:"idle"},smart:{status:"idle"}} as Record<Tier,VideoState>;
   for(const tier of tiers){
    let image=await localMedia(tierMeta[tier].mediaKey);if(!image)image=await restoreRemote(tierMeta[tier].mediaKey);if(image)ni[tier]={status:"done",url:URL.createObjectURL(image)};
    let video=await localMedia(tierMeta[tier].videoKey);if(!video)video=await restoreRemote(tierMeta[tier].videoKey);if(video)nv[tier]={status:"done",url:URL.createObjectURL(video)};
   }
   if(alive){setStates(ni);setVideos(nv);telemetry("analyse_media_restore_complete",{portrait:Boolean(localPortrait||await localMedia("portrait")),fullBody:Boolean(localFull||await localMedia("fullBody"))});}
  })();
  return()=>{alive=false};
 },[]);

 const budget=Math.max(60,Number(p.budget||200));
 const looks=useMemo(()=>[{tier:"signature" as Tier,budgetLabel:`Votre budget repère · ${budget} €`,text:"Direction premium, plus habillée et plus affirmée."},{tier:"balance" as Tier,budgetLabel:`Votre budget repère · ${budget} €`,text:"Direction contemporaine avec équilibre style / budget."},{tier:"smart" as Tier,budgetLabel:`Votre budget repère · ${budget} €`,text:"Direction accessible qui conserve l’intention stylistique."}],[budget]);
 const style=(p.styles||[]).slice(0,2).join(" · ")||"Style à préciser";const colors=(p.likedColors||[]).slice(0,2).join(" · ")||"Couleurs libres";const photosReady=Boolean(portrait&&fullBody);const anyLoading=Object.values(states).some(s=>s.status==="loading");

 async function findSimilarProduct(tier:Tier,category:string,query:string,index:number):Promise<LookProduct|null>{
  const response=await fetch("/api/commerce/search",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({query,tier,topSize:p.topSize,bottomSize:p.bottomSize,shoeSize:p.shoeSize,limit:4})});const data=await readJsonSafe(response);
  if(!response.ok)throw new Error(String(data.error||"La recherche marchande est temporairement indisponible."));
  const candidates=Array.isArray(data.results)?(data.results as CommerceResult[]).filter(item=>item?.title&&item?.url&&item?.merchant?.name).slice(0,3):[];
  const checks=await Promise.all(candidates.map(async item=>{try{const validation=await fetch("/api/commerce/validate-link",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:item.url})});const checked=await readJsonSafe(validation);return validation.ok&&checked.valid===true&&checked.reachable===true?item:null}catch{return null}}));
  const found=checks.find(Boolean);if(!found)return null;
  return {id:`${tier}-${index}-${found.merchant.id}`,category,name:found.title,productUrl:found.url,merchant:found.merchant.name,matchType:"similar",affiliate:false};
 }

 async function loadShopping(tier:Tier,silhouette?:string){
  setShopping(current=>({...current,[tier]:{status:"loading"}}));const main=silhouetteLabel(silhouette||fallbackSilhouette(p,tier));const preferredStyle=(p.styles||[])[0]||"élégant";const preferredColor=(p.likedColors||[])[0]||"";const occasion=(p.occasions||[])[0]||"";
  const requests=[{category:main,query:[main,preferredStyle,preferredColor,occasion].filter(Boolean).join(" ")},{category:"Chaussures",query:["chaussures",preferredStyle,preferredColor,occasion].filter(Boolean).join(" ")},{category:"Sac / accessoire",query:["sac accessoire",preferredStyle,preferredColor,occasion].filter(Boolean).join(" ")}];
  try{
   const settled=await Promise.allSettled(requests.map((item,index)=>findSimilarProduct(tier,item.category,item.query,index)));const products=settled.flatMap(item=>item.status==="fulfilled"&&item.value?[item.value]:[]);
   if(!products.length){const firstFailure=settled.find(item=>item.status==="rejected") as PromiseRejectedResult|undefined;throw new Error(firstFailure?String(firstFailure.reason instanceof Error?firstFailure.reason.message:firstFailure.reason):"Aucune pièce similaire vérifiée n’a été trouvée pour ce look.")}
   const data:GeneratedLookShopping={tier,products};setShopping(current=>({...current,[tier]:{status:"done",data}}));telemetry("look_shopping_success",{tier,count:products.length});
  }catch(error){const message=error instanceof Error?error.message:"Recherche marchande indisponible.";setShopping(current=>({...current,[tier]:{status:"error",error:message}}));telemetry("look_shopping_failure",{tier,error:message});}
 }

 async function generateTier(tier:Tier){
  telemetry("tryon_click",{tier,photosReady,portrait:Boolean(portrait),fullBody:Boolean(fullBody)});
  if(!portrait||!fullBody){setGlobalError("Pour créer un look directement sur vous, Look&Go a besoin de votre portrait et de votre photo plein pied.");return false;}
  setGlobalError("");setStates(s=>({...s,[tier]:{status:"loading"}}));
  try{
   const[a,b]=await Promise.all([compressImage(portrait),compressImage(fullBody)]);
   const form=new FormData();form.append("portrait",new File([a],"portrait.jpg",{type:a.type||"image/jpeg"}));form.append("fullBody",new File([b],"full-body.jpg",{type:b.type||"image/jpeg"}));form.append("tier",tier);form.append("profile",JSON.stringify(p));
   const started=Date.now();const res=await fetch("/api/ai/tryon",{method:"POST",body:form});const data=await readJsonSafe(res);if(!res.ok)throw new Error(String(data.error||"Génération impossible"));
   const image=String(data.image||"");if(!image)throw new Error("Aucune image reçue");let rawBlob:Blob;if(image.startsWith("data:"))rawBlob=dataUrlToBlob(image);else{const response=await fetch(image);if(!response.ok)throw new Error("Impossible de récupérer l’image générée");rawBlob=await response.blob();}
   let blob:Blob;try{blob=await applyLookGoWatermark(rawBlob)}catch(error){telemetry("tryon_watermark_failure",{tier,error:error instanceof Error?error.message:"unknown"});throw new Error("Le branding Look&Go n’a pas pu être intégré à l’image finale. Réessayez.")}
   const silhouette=String(data.silhouette||fallbackSilhouette(p,tier));try{await saveBetaMedia(tierMeta[tier].mediaKey,blob);}catch{}
   void uploadBetaMediaCloud(tierMeta[tier].mediaKey,blob,`${tier}-tryon.png`);void saveBetaHistoryCloud("tryon",{tier,silhouette,durationMs:Date.now()-started,success:true,branded:true});
   setStates(s=>({...s,[tier]:{status:"done",url:URL.createObjectURL(blob),silhouette}}));telemetry("tryon_success",{tier,durationMs:Date.now()-started,branded:true});void loadShopping(tier,silhouette);return true;
  }catch(error){const message=error instanceof Error?error.message:"Erreur IA";void saveBetaHistoryCloud("tryon",{tier,success:false,error:message});setStates(s=>({...s,[tier]:{status:"error",error:message}}));telemetry("tryon_failure",{tier,error:message});return false;}
 }

 async function generateAll(){
  telemetry("tryon_generate_all_click",{photosReady});
  if(!photosReady){setGlobalError("Pour créer un look directement sur vous, Look&Go a besoin de votre portrait et de votre photo plein pied.");return;}
  for(const tier of tiers){const ok=await generateTier(tier);if(!ok)break;}
 }

 async function generateVideo(tier:Tier){
  if(!photosReady){setGlobalError("Pour créer un look directement sur vous, Look&Go a besoin de votre portrait et de votre photo plein pied.");return;}
  const imageBlob=await localMedia(tierMeta[tier].mediaKey);if(!imageBlob){setVideos(v=>({...v,[tier]:{status:"error",error:"Générez d’abord ce look photo."}}));return;}
  setVideos(v=>({...v,[tier]:{status:"loading",progress:0}}));
  try{
   const videoInput=await runwayFrame(imageBlob);const form=new FormData();form.append("image",new File([videoInput],`${tier}-runway-720x1280.png`,{type:"image/png"}));form.append("tier",tier);const started=Date.now();
   const create=await fetch("/api/ai/runway",{method:"POST",body:form});const created=await readJsonSafe(create);if(!create.ok)throw new Error(String(created.error||"Création du défilé impossible"));const id=String(created.id||"");if(!id)throw new Error("Aucun identifiant vidéo reçu");
   let completed=false;for(let attempt=0;attempt<48;attempt++){await wait(5000);const statusRes=await fetch(`/api/ai/runway?id=${encodeURIComponent(id)}`,{cache:"no-store"});const status=await readJsonSafe(statusRes);if(!statusRes.ok)throw new Error(String(status.error||"Suivi du défilé impossible"));setVideos(v=>({...v,[tier]:{...v[tier],status:"loading",progress:Number(status.progress||0)}}));if(status.status==="failed")throw new Error(String(status.error||"La génération vidéo a échoué"));if(status.status==="completed"){completed=true;break;}}
   if(!completed)throw new Error("Le défilé prend plus de temps que prévu.");const content=await fetch(`/api/ai/runway/content?id=${encodeURIComponent(id)}`,{cache:"no-store"});if(!content.ok){const data=await readJsonSafe(content);throw new Error(String(data.error||"Impossible de récupérer la vidéo"));}
   const blob=await content.blob();try{await saveBetaMedia(tierMeta[tier].videoKey,blob);}catch{}void uploadBetaMediaCloud(tierMeta[tier].videoKey,blob,`${tier}-runway.mp4`);void saveBetaHistoryCloud("runway",{tier,durationMs:Date.now()-started,success:true});setVideos(v=>({...v,[tier]:{status:"done",progress:100,url:URL.createObjectURL(blob)}}));telemetry("runway_success",{tier,durationMs:Date.now()-started});
  }catch(error){const message=error instanceof Error?error.message:"Erreur vidéo";void saveBetaHistoryCloud("runway",{tier,success:false,error:message});setVideos(v=>({...v,[tier]:{status:"error",error:message}}));telemetry("runway_failure",{tier,error:message});}
 }

 return <main className="analysis-page"><header className="profile-header"><Link href="/" className="profile-logo">LOOK&GO</Link><span>TRY-ON & DÉFILÉ · 03/03</span></header><section className="analysis-shell"><div className="analysis-hero"><p className="profile-eyebrow">VOTRE PROFIL BÊTA EST PRÊT</p><h1>{p.pseudo?`${p.pseudo}, `:""}voyez maintenant vos <em>3 directions sur vous.</em></h1><p>Look&Go utilise votre portrait comme référence d’identité et votre photo plein pied comme référence de silhouette. Les deux photos sont obligatoires pour toute génération photo ou vidéo.</p></div>
 <div className="analysis-grid"><article><span>01</span><strong>Taille</strong><p>{p.topSize||"—"} haut · {p.bottomSize||"—"} bas · {p.shoeSize||"—"} chaussures</p></article><article><span>02</span><strong>Couleurs</strong><p>{colors}</p></article><article><span>03</span><strong>Style</strong><p>{style}</p></article><article><span>04</span><strong>Budget</strong><p>{budget} € · priorité {p.budgetMode||"Équilibre"}</p></article></div>
 <div className={`photo-gate ${photosReady?"ready":"missing"}`}><div><span className="photo-gate-kicker">PHOTOS DE RÉFÉRENCE</span><h2>{mediaLoading?"Vérification locale…":photosReady?"Vos deux photos sont prêtes.":"Pour créer un look directement sur vous, Look&Go a besoin de votre portrait et de votre photo plein pied."}</h2><p>Portrait : {portrait?"✓ enregistré":"manquant"} · Plein pied : {fullBody?"✓ enregistré":"manquant"}</p></div>{!mediaLoading&&!photosReady&&<Link href="/inscription?returnTo=%2Finscription%2Fanalyse" className="photo-gate-action">Ajouter mes photos →</Link>}{photosReady&&<Link href="/inscription?returnTo=%2Finscription%2Fanalyse" className="photo-gate-secondary">Remplacer mes photos</Link>}</div>
 <div className="result-head"><div><p className="profile-eyebrow">VOS VISUALISATIONS</p><h2>Vous.<br/><em>Trois directions.</em></h2></div><div><p>Générez vos looks directement sur vous, puis animez ceux que vous souhaitez voir en mouvement. Le logo officiel Look&Go est intégré dans chaque nouvelle image finale.</p>{photosReady?<button className="profile-submit" type="button" onClick={generateAll} disabled={anyLoading}>{anyLoading?"Génération en cours…":"Générer mes 3 looks sur moi →"}</button>:<Link href="/inscription?returnTo=%2Finscription%2Fanalyse" className="profile-submit analysis-link-button">Ajouter mes photos →</Link>}</div></div>
 {globalError&&<div className="profile-required">{globalError}</div>}
 <div className="result-grid">{looks.map(l=>{const meta=tierMeta[l.tier],state=states[l.tier],video=videos[l.tier],shop=shopping[l.tier];return <article className={`result-card ${meta.tone}`} key={l.tier}><span className="result-kicker">TRY-ON · BÊTA</span><h3>{meta.name}</h3><div className="result-price">{l.budgetLabel}</div>{state.url?<img src={state.url} alt={`Visualisation ${meta.name}`} style={{width:"100%",aspectRatio:"2/3",objectFit:"cover",margin:"18px 0",borderRadius:18}}/>:<div className="result-empty">{state.status==="loading"?"Préparation et génération du look…":photosReady?"Prêt à générer sur vous":"Ajoutez vos deux photos pour activer ce Try-On"}</div>}{video.url&&<video src={video.url} controls playsInline preload="metadata" style={{width:"100%",aspectRatio:"9/16",objectFit:"cover",margin:"0 0 18px",borderRadius:18,background:"#000"}}/>}<p>{l.text}</p><div className="result-tags"><span>{style}</span><span>{colors}</span><span>{p.topSize||"Taille"}</span></div>{state.status==="error"&&<p className="profile-required">{state.error}</p>}{video.status==="error"&&<p className="profile-required">{video.error}</p>}{photosReady?<button className="profile-submit" type="button" onClick={()=>void generateTier(l.tier)} disabled={state.status==="loading"||video.status==="loading"}>{state.status==="loading"?"Génération…":state.url?"Régénérer ce look sur moi":"Générer ce look sur moi"} →</button>:<Link href="/inscription?returnTo=%2Finscription%2Fanalyse" className="profile-submit analysis-link-button">Ajouter mes photos →</Link>}<button className="profile-submit" type="button" onClick={()=>void generateVideo(l.tier)} disabled={!photosReady||!state.url||video.status==="loading"}>{video.status==="loading"?`Création du défilé… ${Math.round(video.progress||0)}%`:video.url?"Régénérer mon défilé":"Créer mon défilé"} →</button><ShoppingSection tier={l.tier} state={shop} canLoad={Boolean(state.url)} onLoad={()=>void loadShopping(l.tier,state.silhouette||fallbackSilhouette(p,l.tier))}/></article>})}</div>
 <div className="analysis-final"><div><span>WORKFLOW COMPLET</span><p>Photos de référence → Try-On brandé → pièces similaires vérifiées → défilé → sauvegarde dans votre profil.</p></div><Link href="/profil">Ouvrir mon espace <span>→</span></Link></div><p className="analysis-truth">BÊTA IA : les images et vidéos restent des visualisations génératives. Elles ne garantissent pas une reproduction parfaite ni l’existence commerciale exacte des vêtements affichés. Les liens shopping sont présentés comme similaires tant qu’une correspondance exacte n’est pas vérifiée.</p></section></main>;
}
