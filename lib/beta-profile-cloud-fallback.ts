"use client";

import type { BetaProfile } from "@/lib/beta-profile";
import { getLookGoFirebase } from "@/lib/firebase-client";

const PROFILE_PATH_SUFFIX="reference/profile-state-v1.dat";

function trace(stage:string,detail:Record<string,unknown>={}){
 if(typeof window==="undefined")return;
 void fetch("/api/client-telemetry",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event:"beta_profile_snapshot",detail:{stage,...detail}}),keepalive:true}).catch(()=>{});
}

export async function saveBetaProfileSnapshot(profile:BetaProfile){
 const fb=getLookGoFirebase();const user=fb?.auth.currentUser;
 if(!fb||!user||user.isAnonymous)return false;
 try{
  const token=await user.getIdToken();
  const blob=new Blob([JSON.stringify(profile)],{type:"image/png"});
  const form=new FormData();form.append("file",blob,"profile-state-v1.dat");form.append("key","profileState");form.append("uid",user.uid);form.append("fileName","profile-state-v1.dat");
  const response=await fetch("/api/storage/upload",{method:"POST",headers:{Authorization:`Bearer ${token}`},body:form,cache:"no-store"});
  if(!response.ok){trace("save_failed",{status:response.status});return false}
  trace("save_ok");return true;
 }catch(error){trace("save_exception",{message:error instanceof Error?error.message:"unknown"});return false}
}

export async function readBetaProfileSnapshot():Promise<BetaProfile|null>{
 const fb=getLookGoFirebase();const user=fb?.auth.currentUser;
 if(!fb||!user||user.isAnonymous)return null;
 try{
  const token=await user.getIdToken();const path=`users/${user.uid}/${PROFILE_PATH_SUFFIX}`;
  const response=await fetch(`/api/storage/download?path=${encodeURIComponent(path)}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
  if(!response.ok){trace("read_failed",{status:response.status});return null}
  const text=await response.text();const parsed=JSON.parse(text) as BetaProfile;
  trace("read_ok");return parsed&&typeof parsed==="object"?parsed:null;
 }catch(error){trace("read_exception",{message:error instanceof Error?error.message:"unknown"});return null}
}
