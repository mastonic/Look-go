"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";

const ADMIN_EMAIL="rigahludovic@gmail.com";

export default function AdminShortcut(){
 const [isAdmin,setIsAdmin]=useState(false);
 const [target,setTarget]=useState<HTMLElement|null>(null);

 useEffect(()=>{
  let active=true;
  void fetch("/api/auth/session",{cache:"no-store"})
   .then(r=>r.json())
   .then(session=>{
    if(!active)return;
    const email=String(session?.user?.email||"").trim().toLowerCase();
    setIsAdmin(email===ADMIN_EMAIL);
   })
   .catch(()=>{});

  const findTarget=()=>{
   const scan=document.querySelector<HTMLElement>(".v2-header-cta");
   if(scan?.parentElement)setTarget(scan.parentElement);
  };
  findTarget();
  const timer=window.setInterval(findTarget,500);
  return()=>{active=false;window.clearInterval(timer);};
 },[]);

 if(!isAdmin||!target)return null;
 return createPortal(
  <Link href="/admin/ai" className="lookgo-admin-shortcut" aria-label="Ouvrir la console d’administration IA">Admin</Link>,
  target,
 );
}
