"use client";

import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { EmailAuthProvider, isSignInWithEmailLink, linkWithCredential, sendSignInLinkToEmail, signInAnonymously, signInWithEmailLink, type User } from "firebase/auth";
import { getLookGoFirebase } from "@/lib/firebase-client";
import type { BetaProfile } from "@/lib/beta-profile";
import type { BetaMediaKey } from "@/lib/beta-media";

const EMAIL_KEY="lookgo_beta_email_link";

async function cloudUser():Promise<User|null>{
 const fb=getLookGoFirebase();if(!fb)return null;
 if(fb.auth.currentUser)return fb.auth.currentUser;
 try{return (await signInAnonymously(fb.auth)).user}catch{return null}
}

export async function requestBetaEmailLink(email:string){
 const fb=getLookGoFirebase();if(!fb||typeof window==="undefined")return false;
 try{
  await sendSignInLinkToEmail(fb.auth,email,{url:`${window.location.origin}/auth/finish`,handleCodeInApp:true});
  localStorage.setItem(EMAIL_KEY,email);
  return true;
 }catch{return false}
}

export function storedBetaEmail(){if(typeof window==="undefined")return "";return localStorage.getItem(EMAIL_KEY)||""}
export function isBetaEmailLink(url?:string){const fb=getLookGoFirebase();if(!fb||typeof window==="undefined")return false;return isSignInWithEmailLink(fb.auth,url||window.location.href)}

export async function finishBetaEmailLink(email:string,url?:string){
 const fb=getLookGoFirebase();if(!fb||typeof window==="undefined")return false;
 const href=url||window.location.href;if(!isSignInWithEmailLink(fb.auth,href))return false;
 try{
  const current=fb.auth.currentUser;
  if(current?.isAnonymous){
   try{const credential=EmailAuthProvider.credentialWithLink(email,href);await linkWithCredential(current,credential);}catch{await signInWithEmailLink(fb.auth,email,href);}
  }else await signInWithEmailLink(fb.auth,email,href);
  localStorage.setItem(EMAIL_KEY,email);
  return true;
 }catch{return false}
}

export async function betaAuthStatus(){
 const fb=getLookGoFirebase();if(!fb)return {ready:false,durable:false,email:""};
 const user=await cloudUser();return {ready:Boolean(user),durable:Boolean(user&&!user.isAnonymous),email:user?.email||""};
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
  const folder=key.startsWith("video")?"runways":key.startsWith("tryon")?"tryons":"reference";
  const objectRef=ref(fb.storage,`users/${user.uid}/${folder}/${key}-${Date.now()}-${safe}`);
  await uploadBytes(objectRef,file,{contentType:file.type||"application/octet-stream"});
  const url=await getDownloadURL(objectRef);
  const userRef=doc(fb.db,"users",user.uid);
  await setDoc(userRef,{updatedAt:serverTimestamp(),beta:true},{merge:true});
  await updateDoc(userRef,{[`media.${key}`]:{url,name:fileName||safe,updatedAt:new Date().toISOString(),type:file.type||"application/octet-stream"}});
  return url;
 }catch{return null}
}

export async function readBetaMediaCloud(key:BetaMediaKey):Promise<{blob:Blob;name:string;url:string}|null>{
 const fb=getLookGoFirebase();const user=await cloudUser();if(!fb||!user)return null;
 try{
  const snap=await getDoc(doc(fb.db,"users",user.uid));
  if(!snap.exists())return null;
  const media=snap.data().media as Record<string,{url?:string;name?:string}>|undefined;
  const item=media?.[key];if(!item?.url)return null;
  const response=await fetch(item.url,{cache:"no-store"});if(!response.ok)return null;
  return {blob:await response.blob(),name:item.name||key,url:item.url};
 }catch{return null}
}

export async function saveBetaHistoryCloud(kind:"tryon"|"runway"|"profile"|"event",payload:Record<string,unknown>){
 const fb=getLookGoFirebase();const user=await cloudUser();if(!fb||!user)return false;
 try{await addDoc(collection(fb.db,"users",user.uid,"history"),{kind,...payload,createdAt:serverTimestamp()});return true}catch{return false}
}
