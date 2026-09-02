"use client";

import {useEffect,useMemo,useState} from "react";

type ProviderId="openai"|"google"|"anthropic"|"higgsfield";
type Provider={id:ProviderId;label:string;enabled:boolean;configured:boolean;capabilities:string[]};
type State={providers:Provider[];canManage:boolean};

type RowState={enabled:boolean;apiKey:string;busy:boolean;message:string;error:string};

const PROVIDER_HELP:Record<ProviderId,string>={
 openai:"OPENAI_API_KEY",
 google:"GOOGLE_AI_API_KEY",
 anthropic:"ANTHROPIC_API_KEY",
 higgsfield:"HIGGSFIELD_API_KEY",
};

export default function AdminAiConsole(){
 const [data,setData]=useState<State|null>(null);
 const [rows,setRows]=useState<Record<string,RowState>>({});
 const [fatal,setFatal]=useState("");

 async function load(){
  setFatal("");
  const response=await fetch("/api/admin/ai",{cache:"no-store"});
  const body=await response.json().catch(()=>({}));
  if(!response.ok){setFatal(body.error||"Impossible de charger la configuration.");return;}
  const next=body as State;
  setData(next);
  setRows(Object.fromEntries(next.providers.map(provider=>[
   provider.id,
   {enabled:provider.enabled,apiKey:"",busy:false,message:"",error:""},
  ])));
 }

 useEffect(()=>{void load();},[]);

 const providers=useMemo(()=>data?.providers||[],[data]);

 function patch(id:ProviderId,patch:Partial<RowState>){
  setRows(current=>({...current,[id]:{...current[id],...patch}}));
 }

 async function submit(provider:Provider,action:"test"|"save"){
  const row=rows[provider.id];
  if(!row||row.busy)return;
  patch(provider.id,{busy:true,message:"",error:""});
  try{
   const response=await fetch("/api/admin/ai",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({provider:provider.id,enabled:row.enabled,apiKey:row.apiKey,action}),
   });
   const body=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(body.error||"Opération impossible.");
   patch(provider.id,{message:body.message||"Opération réussie.",apiKey:action==="save"?"":row.apiKey});
   if(action==="save")setTimeout(()=>void load(),1200);
  }catch(error){
   patch(provider.id,{error:error instanceof Error?error.message:"Opération impossible."});
  }finally{
   patch(provider.id,{busy:false});
  }
 }

 return <main className="admin-ai-page">
  <header className="admin-ai-header">
   <div>
    <span className="admin-ai-overline">LOOK&GO · ADMIN</span>
    <h1>Console IA</h1>
    <p>Activez les moteurs, testez les connexions et remplacez les clés API sans jamais les exposer au navigateur après enregistrement.</p>
   </div>
   <a href="/">Retour à Look&Go</a>
  </header>

  <section className="admin-ai-notice">
   <strong>Clés protégées côté serveur</strong>
   <p>Une clé saisie ici est envoyée uniquement à l’API admin authentifiée, validée auprès du fournisseur, puis enregistrée comme variable sensible Vercel. La valeur existante n’est jamais renvoyée dans cette page.</p>
  </section>

  {fatal&&<div className="admin-ai-error">{fatal}</div>}
  {!data&&!fatal&&<div className="admin-ai-loading">Chargement de la console…</div>}

  {data&&<>
   {!data.canManage&&<div className="admin-ai-warning"><strong>Gestion distante désactivée.</strong> Ajoutez une seule fois <code>VERCEL_TOKEN</code> côté serveur pour permettre la rotation des clés depuis cette page.</div>}

   <section className="admin-ai-grid">
    {providers.map(provider=>{
     const row=rows[provider.id];
     if(!row)return null;
     return <article className="admin-ai-card" key={provider.id}>
      <div className="admin-ai-card-top">
       <div>
        <span className={`admin-ai-dot ${provider.configured?"ok":"off"}`}/>
        <h2>{provider.label}</h2>
       </div>
       <label className="admin-ai-switch">
        <input type="checkbox" checked={row.enabled} onChange={event=>patch(provider.id,{enabled:event.target.checked})}/>
        <span/>
       </label>
      </div>

      <div className="admin-ai-meta">
       <span>{provider.configured?"Clé configurée":"Clé absente"}</span>
       <span>{row.enabled?"Activé":"Désactivé"}</span>
      </div>

      <p className="admin-ai-capabilities">{provider.capabilities.join(" · ")}</p>

      <label className="admin-ai-key-label" htmlFor={`key-${provider.id}`}>Remplacer la clé serveur</label>
      <input
       id={`key-${provider.id}`}
       className="admin-ai-key"
       type="password"
       autoComplete="new-password"
       spellCheck={false}
       value={row.apiKey}
       placeholder={provider.configured?"Laisser vide pour conserver la clé actuelle":PROVIDER_HELP[provider.id]}
       onChange={event=>patch(provider.id,{apiKey:event.target.value})}
      />
      <small>Variable serveur : <code>{PROVIDER_HELP[provider.id]}</code></small>

      {row.message&&<div className="admin-ai-success">{row.message}</div>}
      {row.error&&<div className="admin-ai-error compact">{row.error}</div>}

      <div className="admin-ai-actions">
       <button type="button" className="secondary" disabled={row.busy||provider.id==="higgsfield"} onClick={()=>void submit(provider,"test")}>{row.busy?"Patientez…":"Tester"}</button>
       <button type="button" disabled={row.busy||!data.canManage} onClick={()=>void submit(provider,"save")}>{row.busy?"Enregistrement…":"Enregistrer côté serveur"}</button>
      </div>
     </article>;
    })}
   </section>

   <section className="admin-ai-footer-note">
    <h2>Ce qui se passe après « Enregistrer »</h2>
    <p>Look&Go valide la nouvelle clé si vous en avez saisi une, met à jour la variable sensible Vercel, conserve uniquement l’état activé/désactivé dans les variables d’environnement puis lance un redéploiement production. Les nouvelles fonctions serveur utilisent ensuite la nouvelle clé.</p>
   </section>
  </>}
 </main>;
}
