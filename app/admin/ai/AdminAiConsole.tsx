"use client";

import {useEffect,useMemo,useState} from "react";
import {onAuthStateChanged,type User} from "firebase/auth";
import {getLookGoFirebase} from "@/lib/firebase-client";

type ProviderId="openai"|"google"|"anthropic"|"higgsfield";
type Provider={id:ProviderId;label:string;enabled:boolean;configured:boolean;capabilities:string[]};
type LastVideo={provider:string;model:string;videoId:string;duration:number;createdAt:string|null;status:string;promptVersion:string};
type State={providers:Provider[];canManage:boolean;lastVideo?:LastVideo|null};
type RowState={enabled:boolean;apiKey:string;busy:boolean;message:string;error:string};
const ADMIN_EMAIL="rigahludovic@gmail.com";
const PROVIDER_HELP:Record<ProviderId,string>={openai:"OPENAI_API_KEY",google:"GOOGLE_AI_API_KEY",anthropic:"ANTHROPIC_API_KEY",higgsfield:"HIGGSFIELD_API_KEY"};

export default function AdminAiConsole(){
 const [data,setData]=useState<State|null>(null);
 const [rows,setRows]=useState<Record<string,RowState>>({});
 const [fatal,setFatal]=useState("");
 const [user,setUser]=useState<User|null|undefined>(undefined);

 useEffect(()=>{
  const firebase=getLookGoFirebase();
  if(!firebase){setUser(null);return;}
  return onAuthStateChanged(firebase.auth,current=>setUser(current));
 },[]);

 async function authHeaders(extra?:Record<string,string>){
  const token=await user?.getIdToken();
  return {...extra,...(token?{Authorization:`Bearer ${token}`}:{})};
 }

 async function load(){
  if(!user||String(user.email||"").toLowerCase()!==ADMIN_EMAIL)return;
  setFatal("");
  const response=await fetch("/api/admin/ai",{cache:"no-store",headers:await authHeaders()});
  const body=await response.json().catch(()=>({}));
  if(!response.ok){setFatal(body.error||"Impossible de charger la configuration.");return;}
  const next=body as State;
  setData(next);
  setRows(Object.fromEntries(next.providers.map(provider=>[provider.id,{enabled:provider.enabled,apiKey:"",busy:false,message:"",error:""}])));
 }

 useEffect(()=>{if(user)void load();},[user]);
 const providers=useMemo(()=>data?.providers||[],[data]);
 function patch(id:ProviderId,patchData:Partial<RowState>){setRows(current=>({...current,[id]:{...current[id],...patchData}}));}

 async function submit(provider:Provider,action:"test"|"save"){
  const row=rows[provider.id];
  if(!row||row.busy)return;
  patch(provider.id,{busy:true,message:"",error:""});
  try{
   const response=await fetch("/api/admin/ai",{method:"POST",headers:await authHeaders({"content-type":"application/json"}),body:JSON.stringify({provider:provider.id,enabled:row.enabled,apiKey:row.apiKey,action})});
   const body=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(body.error||"Opération impossible.");
   patch(provider.id,{message:body.message||"Opération réussie.",apiKey:action==="save"?"":row.apiKey});
   if(action==="save")setTimeout(()=>void load(),1200);
  }catch(error){patch(provider.id,{error:error instanceof Error?error.message:"Opération impossible."});}
  finally{patch(provider.id,{busy:false});}
 }

 if(user===undefined)return <main className="admin-ai-page"><div className="admin-ai-loading">Vérification de votre session…</div></main>;
 if(!user||String(user.email||"").trim().toLowerCase()!==ADMIN_EMAIL)return <main className="admin-ai-page"><div className="admin-ai-error">Accès réservé à l’administrateur Look&Go.</div><a href="/connexion?returnTo=%2Fadmin%2Fai">Se connecter</a></main>;

 return <main className="admin-ai-page">
  <header className="admin-ai-header"><div><span className="admin-ai-overline">LOOK&GO · ADMIN</span><h1>Console IA</h1><p>Activez les moteurs, testez les connexions et remplacez les clés API sans les exposer après enregistrement.</p></div><a href="/">Retour à Look&Go</a></header>
  <section className="admin-ai-notice"><strong>Clés protégées côté serveur</strong><p>La clé saisie est envoyée uniquement à l’API admin authentifiée puis enregistrée comme variable sensible Vercel. La clé existante n’est jamais renvoyée au navigateur.</p></section>
  {fatal&&<div className="admin-ai-error">{fatal}</div>}
  {!data&&!fatal&&<div className="admin-ai-loading">Chargement de la console…</div>}
  {data&&<>
   {data.lastVideo&&<section className="admin-ai-notice"><strong>Dernière génération vidéo</strong><p><b>Moteur :</b> {data.lastVideo.provider==="openai"?"OpenAI":data.lastVideo.provider} · <b>Modèle :</b> {data.lastVideo.model} · <b>Durée :</b> {data.lastVideo.duration}s · <b>Statut :</b> {data.lastVideo.status}</p><p><b>Prompt :</b> {data.lastVideo.promptVersion} · <b>ID :</b> <code>{data.lastVideo.videoId}</code>{data.lastVideo.createdAt?<> · <b>Créée :</b> {new Date(data.lastVideo.createdAt).toLocaleString("fr-FR")}</>:null}</p></section>}
   {!data.canManage&&<div className="admin-ai-warning"><strong>Gestion distante désactivée.</strong> Ajoutez <code>VERCEL_TOKEN</code> côté serveur pour permettre la rotation des clés.</div>}
   <section className="admin-ai-grid">{providers.map(provider=>{const row=rows[provider.id];if(!row)return null;return <article className="admin-ai-card" key={provider.id}>
    <div className="admin-ai-card-top"><div><span className={`admin-ai-dot ${provider.configured?"ok":"off"}`}/><h2>{provider.label}</h2></div><label className="admin-ai-switch"><input type="checkbox" checked={row.enabled} onChange={event=>patch(provider.id,{enabled:event.target.checked})}/><span/></label></div>
    <div className="admin-ai-meta"><span>{provider.configured?"Clé configurée":"Clé absente"}</span><span>{row.enabled?"Activé":"Désactivé"}</span></div>
    <p className="admin-ai-capabilities">{provider.capabilities.join(" · ")}</p>
    <label className="admin-ai-key-label" htmlFor={`key-${provider.id}`}>Remplacer la clé serveur</label>
    <input id={`key-${provider.id}`} className="admin-ai-key" type="password" autoComplete="new-password" spellCheck={false} value={row.apiKey} placeholder={provider.configured?"Laisser vide pour conserver la clé actuelle":PROVIDER_HELP[provider.id]} onChange={event=>patch(provider.id,{apiKey:event.target.value})}/>
    <small>Variable serveur : <code>{PROVIDER_HELP[provider.id]}</code></small>
    {row.message&&<div className="admin-ai-success">{row.message}</div>}{row.error&&<div className="admin-ai-error compact">{row.error}</div>}
    <div className="admin-ai-actions"><button type="button" className="secondary" disabled={row.busy||provider.id==="higgsfield"} onClick={()=>void submit(provider,"test")}>{row.busy?"Patientez…":"Tester"}</button><button type="button" disabled={row.busy||!data.canManage} onClick={()=>void submit(provider,"save")}>{row.busy?"Enregistrement…":"Enregistrer côté serveur"}</button></div>
   </article>})}</section>
  </>}
 </main>;
}
