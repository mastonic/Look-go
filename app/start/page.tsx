"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readBetaProfile, saveBetaProfile, type BetaProfile } from "@/lib/beta-profile";
import { readBetaProfileCloud } from "@/lib/firebase-beta";

function hasIdentity(profile:BetaProfile){return Boolean(profile.email||profile.pseudo)}
function safeReturnTo(){
  if(typeof window==="undefined")return "";
  const value=new URLSearchParams(window.location.search).get("returnTo")||"";
  return value.startsWith("/")&&!value.startsWith("//")?value:"";
}
function nextPath(profile:BetaProfile,returnTo=""){
  if(profile.complete)return returnTo||"/profil";
  const identityReady=Boolean(profile.email&&profile.pseudo&&profile.height&&profile.weight&&profile.age&&profile.portraitName&&profile.fullName);
  return identityReady?"/inscription/style":"/inscription";
}

export default function StartPage(){
  const router=useRouter();
  const [label,setLabel]=useState("Recherche de votre espace Look&Go…");
  useEffect(()=>{
    let active=true;
    (async()=>{
      const returnTo=safeReturnTo();
      if(returnTo&&typeof window!=="undefined")localStorage.setItem("lookgo_return_to",returnTo);
      const local=readBetaProfile();
      let cloud:BetaProfile|null=null;
      try{cloud=await readBetaProfileCloud()}catch{}
      if(!active)return;
      const merged={...(cloud||{}),...local};
      if(hasIdentity(merged)){
        saveBetaProfile(merged);
        setLabel(profileLabel(merged));
        router.replace(nextPath(merged,returnTo));
      }else{
        const suffix=returnTo?`&returnTo=${encodeURIComponent(returnTo)}`:"";
        router.replace(`/connexion?mode=register${suffix}`);
      }
    })();
    return()=>{active=false};
  },[router]);
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#050505",color:"#f7f1e8",padding:24,textAlign:"center"}}><div><div style={{fontFamily:"serif",fontSize:30,marginBottom:12}}>LOOK&GO</div><p style={{opacity:.72}}>{label}</p></div></main>;
}

function profileLabel(profile:BetaProfile){
  if(profile.complete)return "Bienvenue à nouveau. Ouverture de votre espace…";
  return "Votre progression a été retrouvée. Reprise de votre parcours…";
}
