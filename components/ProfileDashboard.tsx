"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {createPortal} from "react-dom";
import {usePathname} from "next/navigation";
import {readBetaProfile,type BetaProfile} from "@/lib/beta-profile";
import {readBetaMedia,type BetaMediaKey} from "@/lib/beta-media";
import {readBetaHistoryCloud,readBetaMediaCloud} from "@/lib/firebase-beta";
import styles from "./ProfileDashboard.module.css";

type HistoryItem=Record<string,unknown>;
type MediaPreview={key:BetaMediaKey;url:string;label:string;href:string};

const LOOK_KEYS:Array<{key:BetaMediaKey;label:string;href:string}>=[
 {key:"tryonSignature",label:"Signature",href:"/inscription/analyse"},
 {key:"tryonBalance",label:"Équilibre",href:"/inscription/analyse"},
 {key:"tryonSmart",label:"Smart",href:"/inscription/analyse"},
 {key:"weddingTryonSignature",label:"Mariage · Signature",href:"/inscription/analyse?mode=wedding"},
 {key:"weddingTryonBalance",label:"Mariage · Équilibre",href:"/inscription/analyse?mode=wedding"},
 {key:"weddingTryonSmart",label:"Mariage · Smart",href:"/inscription/analyse?mode=wedding"},
];

async function mediaBlob(key:BetaMediaKey){
 try{const local=await readBetaMedia(key);if(local)return local}catch{}
 try{return (await readBetaMediaCloud(key))?.blob||null}catch{return null}
}

function historyLabel(item:HistoryItem){
 const kind=String(item.kind||"");const mode=String(item.mode||"");const tier=String(item.tier||"");const action=String(item.action||"");
 if(kind==="runway")return `Défilé ${mode==="wedding"?"mariage ":""}${tier||"IA"}`;
 if(kind==="tryon")return `${mode==="wedding"?"Look mariage":"Look IA"}${tier?` · ${tier}`:""}${action==="recolor"?" · couleur modifiée":action==="multi-angle"?" · nouvel angle":""}`;
 if(kind==="profile")return "Profil mis à jour";
 if(kind==="event")return "Pack Mariage mis à jour";
 return "Activité Look&Go";
}

function historyMeta(item:HistoryItem){
 const color=String(item.primaryColor||"");const angle=String(item.angle||"");const success=item.success;
 return [color,angle&&angle!=="front"?angle:"",success===false?"Échec":""].filter(Boolean).join(" · ")||"Enregistré dans votre espace";
}

export default function ProfileDashboard(){
 const pathname=usePathname();
 const [target,setTarget]=useState<HTMLElement|null>(null);
 const [profile,setProfile]=useState<BetaProfile>({});
 const [latest,setLatest]=useState<MediaPreview|null>(null);
 const [refs,setRefs]=useState<Array<{label:string;url:string}>>([]);
 const [history,setHistory]=useState<HistoryItem[]>([]);
 const [loading,setLoading]=useState(true);

 useEffect(()=>{
  if(pathname!=="/profil"){setTarget(null);return;}
  const find=()=>setTarget(document.querySelector<HTMLElement>(".account-content"));
  find();const timer=window.setInterval(find,250);return()=>window.clearInterval(timer);
 },[pathname]);

 useEffect(()=>{
  if(pathname!=="/profil")return;
  let alive=true;const urls:string[]=[];
  void(async()=>{
   const p=readBetaProfile();if(alive)setProfile(p);
   const items=await readBetaHistoryCloud(8);if(alive)setHistory(items);
   const ordered=p.wedding?.enabled?[...LOOK_KEYS.slice(3),...LOOK_KEYS.slice(0,3)]:LOOK_KEYS.slice(0,3);
   for(const item of ordered){const blob=await mediaBlob(item.key);if(blob){const url=URL.createObjectURL(blob);urls.push(url);if(alive)setLatest({key:item.key,url,label:item.label,href:item.href});break;}}
   const refResults:Array<{label:string;url:string}>=[];
   for(const item of [{key:"portrait" as BetaMediaKey,label:"Portrait"},{key:"fullBody" as BetaMediaKey,label:"Plein pied"}]){const blob=await mediaBlob(item.key);if(blob){const url=URL.createObjectURL(blob);urls.push(url);refResults.push({label:item.label,url});}}
   if(alive){setRefs(refResults);setLoading(false);}
  })();
  return()=>{alive=false;urls.forEach(url=>URL.revokeObjectURL(url));};
 },[pathname]);

 const firstName=useMemo(()=>String(profile.pseudo||"vous").trim()||"vous",[profile.pseudo]);
 if(pathname!=="/profil"||!target)return null;

 return createPortal(<section className={styles.dashboard} aria-label="Tableau de bord Look&Go">
  <div className={styles.welcome}>
   <div><span>VOTRE DRESSING PRIVÉ</span><h2>Bonjour, <em>{firstName}</em></h2><p>Votre style, vos dernières créations et tous vos raccourcis au même endroit.</p></div>
   <Link href="/inscription/analyse" className={styles.primary}>Créer un nouveau look <span>→</span></Link>
  </div>

  <div className={styles.heroGrid}>
   <article className={styles.latestCard}>
    <div className={styles.cardHead}><span>DERNIÈRE CRÉATION</span>{latest&&<b>{latest.label}</b>}</div>
    <div className={styles.latestVisual}>{latest?<img src={latest.url} alt={`Dernier look ${latest.label}`}/>:<div className={styles.empty}>{loading?"Ouverture de votre dressing…":"Votre prochain look apparaîtra ici."}</div>}</div>
    <div className={styles.latestFoot}><div><strong>{latest?"Votre dernier Try-On":"Commencez votre look-book"}</strong><small>{latest?"Retrouvez-le, régénérez-le ou créez son défilé.":"Signature · Équilibre · Smart"}</small></div><Link href={latest?.href||"/inscription/analyse"}>{latest?"Ouvrir":"Créer"} →</Link></div>
   </article>

   <div className={styles.sideColumn}>
    <div className={styles.quickGrid}>
     <Link href="/dressing" className={styles.quick}><span>01</span><b>Dressing numérique</b><small>Scanner, classer et retrouver mes pièces</small><i>→</i></Link>
     <Link href="/inscription/analyse" className={styles.quick}><span>02</span><b>Mes looks IA</b><small>Signature · Équilibre · Smart</small><i>→</i></Link>
     <Link href="/mariage" className={styles.quick}><span>03</span><b>Pack Mariage</b><small>{profile.wedding?.enabled?"Continuer mon Wedding Concierge":"Préparer le jour J"}</small><i>→</i></Link>
     <Link href="/shopping" className={styles.quick}><span>04</span><b>Shopping</b><small>Trouver les pièces proches de mes looks</small><i>→</i></Link>
    </div>
    <article className={styles.referencePanel}><div><span>MES RÉFÉRENCES</span><strong>Photos utilisées par l’IA</strong></div><div className={styles.refImages}>{refs.length?refs.map(ref=><figure key={ref.label}><img src={ref.url} alt={ref.label}/><figcaption>{ref.label}</figcaption></figure>):<small>Ajoutez votre portrait et votre photo plein pied.</small>}</div><Link href="/inscription">Gérer mes photos →</Link></article>
   </div>
  </div>

  <div className={styles.lowerGrid}>
   <section className={styles.activity}>
    <div className={styles.sectionHead}><div><span>HISTORIQUE RÉCENT</span><h3>Votre activité</h3></div><Link href="/inscription/analyse">Voir mes looks →</Link></div>
    <div className={styles.timeline}>{history.length?history.slice(0,5).map((item,index)=><article key={String(item.id||index)}><span>{String(index+1).padStart(2,"0")}</span><div><strong>{historyLabel(item)}</strong><small>{historyMeta(item)}</small></div><i>{item.success===false?"!":"✓"}</i></article>):<div className={styles.noHistory}>Vos générations et actions récentes apparaîtront ici automatiquement.</div>}</div>
   </section>
   <section className={styles.profileShortcuts}>
    <div className={styles.sectionHead}><div><span>MON ESPACE</span><h3>Réglages rapides</h3></div></div>
    <Link href="/inscription/style"><b>Préférences mode</b><span>{(profile.styles||[]).slice(0,2).join(" · ")||"À compléter"}</span><i>→</i></Link>
    <Link href="/inscription"><b>Tailles & profil</b><span>{profile.topSize||"—"} / {profile.bottomSize||"—"} · pointure {profile.shoeSize||"—"}</span><i>→</i></Link>
    <Link href="/feedback"><b>Avis bêta</b><span>Aidez-nous à améliorer Look&Go</span><i>→</i></Link>
   </section>
  </div>
 </section>,target);
}
