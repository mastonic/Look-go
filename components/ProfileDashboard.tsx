"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {createPortal} from "react-dom";
import {usePathname} from "next/navigation";
import {readBetaProfile,type BetaProfile} from "@/lib/beta-profile";
import {readBetaMedia,type BetaMediaKey} from "@/lib/beta-media";
import {readBetaHistoryCloud,readBetaMediaCloud} from "@/lib/firebase-beta";
import {readWardrobeItems} from "@/lib/firebase-wardrobe";
import type {WardrobeItem,WardrobeCategory} from "@/lib/wardrobe";
import styles from "./ProfileDashboard.module.css";

type HistoryItem=Record<string,unknown>;
type MediaPreview={key:BetaMediaKey;url:string;label:string;href:string};
type WardrobeLook={title:string;reason:string;items:WardrobeItem[]};

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
function norm(value:unknown){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}
function itemLabel(item:WardrobeItem){return [item.garmentType||item.subcategory||item.categoryLabel,item.primaryColor].filter(Boolean).join(" · ")}
function itemScore(item:WardrobeItem,profile:BetaProfile){
 const likedColors=(profile.likedColors||[]).map(norm);const avoided=(profile.avoidColors||[]).map(norm);const likedStyles=(profile.styles||[]).map(norm);const occasions=(profile.occasions||[]).map(norm);
 const color=norm(item.primaryColor);const itemStyles=(item.styles||[]).map(norm);const itemOccasions=(item.occasions||[]).map(norm);
 if(avoided.some(value=>value&&color.includes(value)))return -100;
 let score=Number(item.confidence||0);
 if(likedColors.some(value=>value&&(color.includes(value)||value.includes(color))))score+=2;
 if(itemStyles.some(value=>likedStyles.some(style=>style&&value.includes(style))))score+=1.6;
 if(itemOccasions.some(value=>occasions.some(occasion=>occasion&&value.includes(occasion))))score+=1.1;
 return score;
}
function pick(items:WardrobeItem[],categories:WardrobeCategory[],profile:BetaProfile,used:Set<string>){return items.filter(item=>categories.includes(item.category)&&!used.has(item.id)&&itemScore(item,profile)>-50).sort((a,b)=>itemScore(b,profile)-itemScore(a,profile))[0]||null}
function buildWardrobeLooks(items:WardrobeItem[],profile:BetaProfile):WardrobeLook[]{
 if(!items.length)return [];
 const looks:WardrobeLook[]=[];const used=new Set<string>();
 const specs:Array<{title:string;reason:string;groups:WardrobeCategory[][]}>=[
  {title:"Facile aujourd’hui",reason:"Une proposition portable construite à partir de vos goûts et couleurs autorisées.",groups:[["tops","knitwear"],["bottoms"],["shoes"],["outerwear","bags","accessories"]]},
  {title:"Plus habillé",reason:"Une silhouette plus élégante sans sortir des pièces réellement présentes dans votre dressing.",groups:[["dresses","jumpsuits","sets"],["shoes"],["outerwear","bags","jewelry","accessories"]]},
  {title:"Nouvelle association",reason:"Look&Go rapproche des pièces compatibles avec votre profil pour vous faire redécouvrir votre penderie.",groups:[["tops","knitwear"],["bottoms"],["outerwear"],["shoes","bags","accessories"]]},
 ];
 for(const spec of specs){const selected:WardrobeItem[]=[];for(const group of spec.groups){const candidate=pick(items,group,profile,used);if(candidate){selected.push(candidate);used.add(candidate.id)}}if(selected.length>=2)looks.push({...spec,items:selected});}
 return looks.slice(0,3);
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
 const [wardrobe,setWardrobe]=useState<WardrobeItem[]>([]);
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
   const [items,wardrobeItems]=await Promise.all([readBetaHistoryCloud(8),readWardrobeItems(120)]);if(alive){setHistory(items);setWardrobe(wardrobeItems)}
   const ordered=p.wedding?.enabled?[...LOOK_KEYS.slice(3),...LOOK_KEYS.slice(0,3)]:LOOK_KEYS.slice(0,3);
   for(const item of ordered){const blob=await mediaBlob(item.key);if(blob){const url=URL.createObjectURL(blob);urls.push(url);if(alive)setLatest({key:item.key,url,label:item.label,href:item.href});break;}}
   const refResults:Array<{label:string;url:string}>=[];
   for(const item of [{key:"portrait" as BetaMediaKey,label:"Portrait"},{key:"fullBody" as BetaMediaKey,label:"Plein pied"}]){const blob=await mediaBlob(item.key);if(blob){const url=URL.createObjectURL(blob);urls.push(url);refResults.push({label:item.label,url});}}
   if(alive){setRefs(refResults);setLoading(false);}
  })();
  return()=>{alive=false;urls.forEach(url=>URL.revokeObjectURL(url));};
 },[pathname]);

 const firstName=useMemo(()=>String(profile.pseudo||"vous").trim()||"vous",[profile.pseudo]);
 const wardrobeLooks=useMemo(()=>buildWardrobeLooks(wardrobe,profile),[wardrobe,profile]);
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
     <Link href="/dressing" className={styles.quick}><span>01</span><b>Dressing numérique</b><small>{wardrobe.length?`${wardrobe.length} pièce${wardrobe.length>1?"s":""} enregistrée${wardrobe.length>1?"s":""}`:"Scanner, classer et retrouver mes pièces"}</small><i>→</i></Link>
     <Link href="/inscription/analyse" className={styles.quick}><span>02</span><b>Mes looks IA</b><small>Signature · Équilibre · Smart</small><i>→</i></Link>
     <Link href="/mariage" className={styles.quick}><span>03</span><b>Pack Mariage</b><small>{profile.wedding?.enabled?"Continuer mon Wedding Concierge":"Préparer le jour J"}</small><i>→</i></Link>
     <Link href="/shopping" className={styles.quick}><span>04</span><b>Shopping</b><small>Trouver les pièces proches de mes looks</small><i>→</i></Link>
    </div>
    <article className={styles.referencePanel}><div><span>MES RÉFÉRENCES</span><strong>Photos utilisées par l’IA</strong></div><div className={styles.refImages}>{refs.length?refs.map(ref=><figure key={ref.label}><img src={ref.url} alt={ref.label}/><figcaption>{ref.label}</figcaption></figure>):<small>Ajoutez votre portrait et votre photo plein pied.</small>}</div><Link href="/inscription">Gérer mes photos →</Link></article>
   </div>
  </div>

  <section className={styles.wardrobeIdeas}>
   <div className={styles.sectionHead}><div><span>LOOKS AVEC MON DRESSING</span><h3>À porter avec ce que vous avez déjà</h3></div><Link href="/dressing">Voir mon dressing →</Link></div>
   {wardrobeLooks.length?<div className={styles.ideaGrid}>{wardrobeLooks.map((look,index)=><article className={styles.ideaCard} key={look.title}><div className={styles.ideaTop}><span>0{index+1}</span><strong>{look.title}</strong></div><p>{look.reason}</p><div className={styles.pieces}>{look.items.map(item=><span key={item.id}>{itemLabel(item)}</span>)}</div><small>Basé uniquement sur les pièces enregistrées et vos préférences Look&Go.</small></article>)}</div>:<div className={styles.wardrobeEmpty}><div><strong>Votre dressing peut devenir votre styliste quotidien.</strong><p>Scannez quelques pièces : Look&Go créera ici des associations à partir de vos vrais vêtements, sans inventer de pièce absente.</p></div><Link href="/dressing">Scanner mon dressing →</Link></div>}
  </section>

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
