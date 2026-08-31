"use client";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { signInAnonymously, type User } from "firebase/auth";
import { getLookGoFirebase } from "@/lib/firebase-client";
import type { BetaProfile } from "@/lib/beta-profile";
import type { BetaMediaKey } from "@/lib/beta-media";

async function cloudUser():Promise<User|null>{
 const fb=getLookGoFirebase();if(!fb)return null;
 if(fb.auth.currentUser)return fb.auth.currentUser;
 try{return (await signInAnonymously(fb.auth)).user}catch{return null}
}

export async function saveBetaProfileCloud(profile:BetaProfile){
 const fb=getLookGoFirebase();const user=await cloudUser();if(!fb||!user)return false;
 try{await setDoc(doc(fb.db,"users",user.uid),{profile,updatedAt:serverTimestamp(),beta:true},{merge:true});return true}catch{return false}
}

export async function readBetaProfileCloud():Promise<BetaProfile|null>{
 const fb=getLookGoFirebase();const user=await cloudUser();if(!fb||!user)return null;
 try{const snap=await getDoc(doc(fb.db,"users",user.uid));return snap.exists()?((snap.data().profile||null) as BetaProfile|null):null}catch{return null}
}

export async function uploadBetaMediaCloud(key:BetaMediaKey,file:Blob,fileName?:string){
 const fb=getLookGoFirebase();const user=await cloudUser();if(!fb||!user)return null;
 try{
  const safe=(fileName||key).replace(/[^a-zA-Z0-9._-]/g,"_");
  const objectRef=ref(fb.storage,`users/${user.uid}/reference/${key}-${Date.now()}-${safe}`);
  await uploadBytes(objectRef,file,{contentType:file.type||"application/octet-stream"});
  const url=await getDownloadURL(objectRef);
  await setDoc(doc(fb.db,"users",user.uid),{media:{[key]:{url,name:fileName||safe,updatedAt:new Date().toISOString()}},updatedAt:serverTimestamp()},{merge:true});
  return url;
 }catch{return null}
}
