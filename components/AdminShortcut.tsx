"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {onAuthStateChanged} from "firebase/auth";
import {getLookGoFirebase} from "@/lib/firebase-client";
import {readBetaProfile} from "@/lib/beta-profile";

const ADMIN_EMAIL="rigahludovic@gmail.com";

export default function AdminShortcut(){
 const [isAdminVisible,setIsAdminVisible]=useState(false);
 const [isAdminAuthenticated,setIsAdminAuthenticated]=useState(false);
 const [target,setTarget]=useState<HTMLElement|null>(null);
 const [mode,setMode]=useState<"profile"|"landing">("landing");

 useEffect(()=>{
  const profileEmail=String(readBetaProfile().email||"").trim().toLowerCase();
  const profileIsAdmin=profileEmail===ADMIN_EMAIL;
  setIsAdminVisible(profileIsAdmin);

  const firebase=getLookGoFirebase();
  const unsubscribe=firebase
   ? onAuthStateChanged(firebase.auth,user=>{
      const email=String(user?.email||"").trim().toLowerCase();
      const authenticated=email===ADMIN_EMAIL;
      setIsAdminAuthenticated(authenticated);
      setIsAdminVisible(profileIsAdmin||authenticated);
     })
   : ()=>{};

  const findTarget=()=>{
   const profileActions=document.querySelector<HTMLElement>(".account-header > div");
   if(profileActions){setTarget(profileActions);setMode("profile");return;}
   const scan=document.querySelector<HTMLElement>(".v2-header-cta");
   if(scan?.parentElement){setTarget(scan.parentElement);setMode("landing");return;}
   setTarget(null);
  };
  findTarget();
  const timer=window.setInterval(findTarget,500);
  return()=>{unsubscribe();window.clearInterval(timer);};
 },[]);

 if(!isAdminVisible||!target)return null;
 const href=isAdminAuthenticated?"/admin/ai":"/connexion?mode=return&returnTo=%2Fadmin%2Fai";
 return createPortal(
  <Link
   href={href}
   aria-label="Ouvrir la console d’administration IA"
   title={isAdminAuthenticated?"Console IA Look&Go":"Reconnectez votre compte administrateur pour ouvrir la console IA"}
   style={{
    marginLeft:mode==="profile"?"8px":"10px",
    border:"1px solid currentColor",
    borderRadius:"999px",
    padding:mode==="profile"?"8px 12px":"10px 14px",
    color:"inherit",
    textDecoration:"none",
    fontSize:"12px",
    fontWeight:700,
    letterSpacing:".08em",
    textTransform:"uppercase",
    whiteSpace:"nowrap",
   }}
  >Admin IA</Link>,
  target,
 );
}
