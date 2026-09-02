"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import {onAuthStateChanged} from "firebase/auth";
import {getLookGoFirebase} from "@/lib/firebase-client";

const ADMIN_EMAIL="rigahludovic@gmail.com";

export default function AdminShortcut(){
 const [isAdmin,setIsAdmin]=useState(false);
 const [target,setTarget]=useState<HTMLElement|null>(null);

 useEffect(()=>{
  const firebase=getLookGoFirebase();
  const unsubscribe=firebase
   ? onAuthStateChanged(firebase.auth,user=>{
      const email=String(user?.email||"").trim().toLowerCase();
      setIsAdmin(email===ADMIN_EMAIL);
     })
   : ()=>{};

  const findTarget=()=>{
   const scan=document.querySelector<HTMLElement>(".v2-header-cta");
   if(scan?.parentElement)setTarget(scan.parentElement);
  };
  findTarget();
  const timer=window.setInterval(findTarget,500);
  return()=>{unsubscribe();window.clearInterval(timer);};
 },[]);

 if(!isAdmin||!target)return null;
 return createPortal(
  <Link
   href="/admin/ai"
   aria-label="Ouvrir la console d’administration IA"
   style={{
    marginLeft:"10px",
    border:"1px solid currentColor",
    borderRadius:"999px",
    padding:"10px 14px",
    color:"inherit",
    textDecoration:"none",
    fontSize:"12px",
    fontWeight:700,
    letterSpacing:".08em",
    textTransform:"uppercase",
    whiteSpace:"nowrap",
   }}
  >Admin</Link>,
  target,
 );
}
