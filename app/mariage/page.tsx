"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { readBetaProfile, saveBetaProfile, type BetaProfile, type WeddingEvent, type WeddingOutfitPreference, type WeddingRole, type WeddingTime, type WeddingVenue } from "@/lib/beta-profile";
import { readBetaProfileCloud, saveBetaHistoryCloud, saveBetaProfileCloud } from "@/lib/firebase-beta";
import { weddingOutfitLabel, weddingRoleLabel } from "@/lib/wedding";
import "../inscription/profile.css";
import "./wedding.css";

function listFromText(value:string){return Array.from(new Set(value.split(/[,;\n]/).map(v=>v.trim()).filter(Boolean))).slice(0,8)}
function dateLabel(value?:string){if(!value)return "Date à définir";try{return new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"long",year:"numeric"}).format(new Date(`${value}T12:00:00`))}catch{return value}}

export default function WeddingPage(){
 const [profile,setProfile]=useState<BetaProfile|null>(null);
 const [requiredColors,setRequiredColors]=useState("");
 const [avoidColors,setAvoidColors]=useState("");
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");

 useEffect(()=>{let alive=true;void(async()=>{const local=readBetaProfile();let cloud:BetaProfile|null=null;try{cloud=await readBetaProfileCloud()}catch{}const merged={...(cloud||{}),...local};if(!alive)return;setProfile(merged);setRequiredColors((merged.wedding?.requiredColors||[]).join(", "));setAvoidColors((merged.wedding?.avoidColors||[]).join(", "));})();return()=>{alive=false}},[]);

 const wedding=profile?.wedding;
 const summary=useMemo(()=>wedding?.enabled?`${weddingRoleLabel(wedding.role)} · ${dateLabel(wedding.date)} · ${wedding.location||"Lieu à définir"}`:"Votre espace mariage n’est pas encore activé.",[wedding]);

 if(profile===null)return <main className="profile-page"/>;
 if(!profile.email&&!profile.pseudo)return <main className="profile-page"><header className="profile-header"><Link href="/" className="profile-logo">LOOK&GO</Link><span>WEDDING CONCIERGE</span></header><section className="wedding-empty"><p className="profile-eyebrow">PACK MARIAGE</p><h1>Connectez votre dressing avant de préparer le mariage.</h1><p>Le Wedding Concierge réutilise vos tailles, vos goûts et vos photos existantes. Vous ne recommencez pas votre profil.</p><Link className="profile-submit" href="/connexion">Retrouver mon espace →</Link></section></main>;

 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setError("");setMessage("");setSaving(true);
  const fd=new FormData(e.currentTarget);
  const event:WeddingEvent={
   enabled:true,
   role:String(fd.get("role")||"guest") as WeddingRole,
   date:String(fd.get("date")||""),
   location:String(fd.get("location")||"").trim(),
   venue:String(fd.get("venue")||"mixed") as WeddingVenue,
   time:String(fd.get("time")||"all-day") as WeddingTime,
   dressCode:String(fd.get("dressCode")||"").trim(),
   outfitPreference:String(fd.get("outfitPreference")||"auto") as WeddingOutfitPreference,
   requiredColors:listFromText(requiredColors),
   avoidColors:listFromText(avoidColors),
   budget:Math.max(50,Number(fd.get("budget")||profile.budget||250)),
   boldness:Math.max(0,Math.min(100,Number(fd.get("boldness")||50))),
   notes:String(fd.get("notes")||"").trim().slice(0,500),
   updatedAt:new Date().toISOString(),
  };
  if(!event.date||!event.location){setError("Ajoutez la date et le lieu du mariage pour personnaliser correctement les looks.");setSaving(false);return}
  const next={...profile,wedding:event};
  try{setProfile(next);saveBetaProfile({wedding:event});await saveBetaProfileCloud(next);void saveBetaHistoryCloud("event",{event:"wedding_concierge_saved",role:event.role,date:event.date,location:event.location,budget:event.budget});setMessage("✓ Pack Mariage activé. Vos prochains Try-On Wedding Concierge utiliseront ce brief et seront sauvegardés séparément de vos looks quotidiens.");}
  catch{setError("Le brief a été enregistré sur cet appareil, mais la synchronisation cloud devra être retentée.")}
  finally{setSaving(false)}
 }

 async function deactivate(){if(!profile.wedding)return;const event={...profile.wedding,enabled:false,updatedAt:new Date().toISOString()};const next={...profile,wedding:event};setProfile(next);saveBetaProfile({wedding:event});try{await saveBetaProfileCloud(next)}catch{}void saveBetaHistoryCloud("event",{event:"wedding_concierge_disabled"});setMessage("Mode Mariage désactivé. Votre brief et vos looks mariage restent conservés.")}

 return <main className="profile-page wedding-page"><header className="profile-header"><Link href="/" className="profile-logo">LOOK&GO</Link><span>WEDDING CONCIERGE · BÊTA</span></header><section className="profile-layout wedding-layout"><div className="profile-intro wedding-intro"><p className="profile-eyebrow">PACK MARIAGE · OFFERT AUX BÊTA-TESTEURS</p><h1>Votre personal shopper pour <em>le jour J.</em></h1><p>Look&Go garde votre profil, vos tailles et vos photos. Ici, vous ajoutez uniquement le contexte du mariage. Le moteur créera ensuite trois directions Signature, Équilibre et Smart, avec Try-On et recherche shopping Miyami.</p><div className={`wedding-status ${wedding?.enabled?"active":""}`}><span>{wedding?.enabled?"PACK ACTIF":"À CONFIGURER"}</span><strong>{summary}</strong>{wedding?.enabled&&<small>Tenue : {weddingOutfitLabel(wedding.outfitPreference)} · Budget {wedding.budget||profile.budget||"—"} €</small>}</div>{wedding?.enabled&&<div className="wedding-launch"><Link href="/inscription/analyse?mode=wedding">Générer mes looks mariage →</Link><Link href="/shopping?mode=wedding">Chercher une pièce mariage →</Link></div>}</div><form className="profile-form wedding-form" onSubmit={save}><div className="wedding-form-head"><span>01 · LE CONTEXTE</span><h2>Parlez-nous du mariage.</h2><p>Ces informations ne remplacent pas votre profil mode : elles deviennent un brief événement temporaire.</p></div><div className="field-grid"><div className="field"><label>Votre rôle</label><select name="role" defaultValue={wedding?.role||"guest"}><option value="bride">Mariée</option><option value="maid">Témoin / demoiselle d’honneur</option><option value="guest">Invitée</option><option value="mother">Mère de la mariée / du marié</option></select></div><div className="field"><label>Date du mariage</label><input name="date" type="date" required defaultValue={wedding?.date||""}/></div></div><div className="field"><label>Lieu / ville</label><input name="location" required defaultValue={wedding?.location||""} placeholder="Ex. Fort-de-France, domaine en Provence…"/></div><div className="field-grid"><div className="field"><label>Cadre</label><select name="venue" defaultValue={wedding?.venue||"mixed"}><option value="outdoor">Extérieur</option><option value="indoor">Intérieur</option><option value="mixed">Mixte</option></select></div><div className="field"><label>Moment</label><select name="time" defaultValue={wedding?.time||"all-day"}><option value="day">Journée</option><option value="evening">Soirée</option><option value="all-day">Journée + soirée</option></select></div></div><div className="field"><label>Dress code / ambiance</label><input name="dressCode" defaultValue={wedding?.dressCode||""} placeholder="Ex. chic tropical, cocktail, black tie, bohème…"/></div><div className="wedding-form-head wedding-section"><span>02 · LA TENUE</span><h2>Fixez la direction, sans enfermer l’IA.</h2></div><div className="field"><label>Type de tenue</label><select name="outfitPreference" defaultValue={wedding?.outfitPreference||"auto"}><option value="auto">Laisser l’IA choisir et varier</option><option value="dress">Robe</option><option value="tailored">Tailleur / ensemble</option><option value="jumpsuit">Combinaison</option></select></div><div className="field"><label>Couleurs souhaitées</label><input value={requiredColors} onChange={e=>setRequiredColors(e.target.value)} placeholder="Ex. terracotta, champagne, olive"/><small>Séparez plusieurs couleurs par des virgules.</small></div><div className="field"><label>Couleurs interdites</label><input value={avoidColors} onChange={e=>setAvoidColors(e.target.value)} placeholder="Ex. blanc, noir, rouge"/></div><div className="field-grid"><div className="field"><label>Budget total look</label><div className="unit-input"><input name="budget" type="number" min="50" max="10000" defaultValue={wedding?.budget||profile.budget||250}/><span>€</span></div></div><div className="field"><label>Audace stylistique</label><input name="boldness" type="range" min="0" max="100" step="5" defaultValue={wedding?.boldness??profile.trendBoldness??50}/></div></div><div className="field"><label>Précision utile pour l’IA</label><textarea name="notes" defaultValue={wedding?.notes||""} maxLength={500} placeholder="Ex. cérémonie religieuse puis réception en extérieur, je veux pouvoir marcher facilement…"/></div>{error&&<div className="profile-required">{error}</div>}{message&&<div className="wedding-success">{message}</div>}<button className="profile-submit" type="submit" disabled={saving}>{saving?"Enregistrement du brief…":wedding?.enabled?"Mettre à jour mon Pack Mariage →":"Activer mon Pack Mariage →"}</button>{wedding?.enabled&&<button className="wedding-secondary" type="button" onClick={()=>void deactivate()}>Désactiver le mode mariage sans supprimer mon brief</button>}<p className="profile-truth">Le Pack Mariage bêta ne déclenche aucun paiement. Les articles shopping restent des résultats marchands réels : prix, taille et stock sont vérifiés chez le marchand.</p></form></section></main>;
}
