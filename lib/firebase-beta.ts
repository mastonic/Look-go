"use client";

import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { EmailAuthProvider, isSignInWithEmailLink, linkWithCredential, sendSignInLinkToEmail, signInAnonymously, signInWithEmailAndPassword, signInWithEmailLink, signOut, updatePassword, type User } from "firebase/auth";
import { getLookGoFirebase } from "@/lib/firebase-client";
import type { BetaProfile } from "@/lib/beta-profile";
import type { BetaMediaKey } from "@/lib/beta-media";

const EMAIL_KEY="lookgo_beta_email_link";

async function cloudUser():Promise<User|null>{const fb=getLookGoFirebase();if(!fb)return null;if(fb.auth.currentUser)return fb.auth.currentUser;try{return (await signInAnonymously(fb.auth)).user}catch{return null}}

function codeError(error:unknown){
 const value=String((error as {code?:string})?.code||"");
 if(value.includes("email-already-in-use"))return "Cet email possède déjà un espace Look&Go. Utilisez « Retrouver mon espace ».";
 if(value.includes("invalid-credential")||value.includes("wrong-password")||value.includes("user-not-found"))return "Email ou code personnel incorrect.";
 if(value.includes("weak-password"))return "Le code doit contenir exactement 6 chiffres.";
 if(value.includes("too-many-requests"))return "Trop de tentatives. Attendez quelques minutes puis réessayez.";
 if(value.includes("operation-not-allowed"))return "La connexion par code n’est pas encore disponible. Réessayez dans quelques instants.";
 if(value.includes("requires-recent-login"))return "Reconnectez-vous avec votre code actuel avant de le modifier.";
 return "Impossible de configurer le code personnel pour le moment.";
}

export function validBetaAccessCode(code:string){return /^\d{6}$/.test(code)}

export async function createOrUpdateBetaAccessCode(email:string,code:string):Promise<{ok:boolean;error?:string}>{
 const fb=getLookGoFirebase();if(!fb)return {ok:false,error:"Le service de connexion est momentanément indisponible. Réessayez dans quelques instants."};
 const normalized=email.trim().toLowerCase();if(!normalized.includes("@"))return {ok:false,error:"Adresse email invalide."};
 if(!validBetaAccessCode(code))return {ok:false,error:"Choisissez un code personnel de 6 chiffres."};
 try{
  const user=await cloudUser();if(!user)return {ok:false,error:"Session Look&Go introuvable."};
  if(user.isAnonymous){
   const credential=EmailAuthProvider.credential(normalized,code);
   await linkWithCredential(user,credential);
  }else{
   if(user.email&&user.email.toLowerCase()!==normalized)return {ok:false,error:"L’email ne correspond pas à votre espace connecté."};
   await updatePassword(user,code);
  }
  await setDoc(doc(fb.db,"users",user.uid),{accessCodeEnabled:true,accessCodeUpdatedAt:serverTimestamp(),updatedAt:serverTimestamp(),beta:true},{merge:true});
  return {ok:true};
 }catch(error){return {ok:false,error:codeError(error)}}
}

export async function signInBetaWithCode(email:string,code:string):Promise<{ok:boolean;profile?:BetaProfile|null;error?:string}>{
 const fb=getLookGoFirebase();if(!fb)return {ok:false,error:"Le service de connexion est momentanément indisponible. Réessayez dans quelques instants."};
 const normalized=email.trim().toLowerCase();if(!normalized.includes("@")||!validBetaAccessCode(code))return {ok:false,error:"Entrez votre email et votre code personnel à 6 chiffres."};
 try{
  const credential=await signInWithEmailAndPassword(fb.auth,normalized,code);
  const snap=await getDoc(doc(fb.db,"users",credential.user.uid));
  const profile=snap.exists()?((snap.data().profile||null) as BetaProfile|null):null;
  return {ok:true,profile};
 }catch(error){return {ok:false,error:codeError(error)}}
}

export async function requestBetaEmailLink(email:string){const fb=getLookGoFirebase();if(!fb||typeof window==="undefined")return false;try{await sendSignInLinkToEmail(fb.auth,email,{url:`${window.location.origin}/auth/finish`,handleCodeInApp:true});localStorage.setItem(EMAIL_KEY,email);return true}catch{return false}}
export function storedBetaEmail(){if(typeof window==="undefined")return "";return localStorage.getItem(EMAIL_KEY)||""}
export function isBetaEmailLink(url?:string){const fb=getLookGoFirebase();if(!fb||typeof window==="undefined")return false;return isSignInWithEmailLink(fb.auth,url||window.location.href)}
export async function finishBetaEmailLink(email:string,url?:string){const fb=getLookGoFirebase();if(!fb||typeof window==="undefined")return false;const href=url||window.location.href;if(!isSignInWithEmailLink(fb.auth,href))return false;try{const current=fb.auth.currentUser;if(current?.isAnonymous){try{const credential=EmailAuthProvider.credentialWithLink(email,href);await linkWithCredential(current,credential)}catch{await signInWithEmailLink(fb.auth,email,href)}}else await signInWithEmailLink(fb.auth,email,href);localStorage.setItem(EMAIL_KEY,email);return true}catch{return false}}
export async function betaAuthStatus(){const fb=getLookGoFirebase();if(!fb)return {ready:false,durable:false,email:"",accessCodeEnabled:false};const user=await cloudUser();if(!user)return {ready:false,durable:false,email:"",accessCodeEnabled:false};let accessCodeEnabled=false;try{const snap=await getDoc(doc(fb.db,"users",user.uid));accessCodeEnabled=Boolean(snap.exists()&&snap.data().accessCodeEnabled)}catch{}return {ready:true,durable:!user.isAnonymous,email:user.email||"",accessCodeEnabled}}
export async function signOutBetaCloud(){const fb=getLookGoFirebase();if(!fb)return;try{await signOut(fb.auth)}catch{}if(typeof window!=="undefined")localStorage.removeItem(EMAIL_KEY)}

export async function saveBetaProfileCloud(profile:BetaProfile){const fb=getLookGoFirebase();const user=await cloudUser();if(!fb||!user)return false;try{await setDoc(doc(fb.db,"users",user.uid),{profile,updatedAt:serverTimestamp(),beta:true},{merge:true});return true}catch{return false}}
export async function readBetaProfileCloud():Promise<BetaProfile|null>{const fb=getLookGoFirebase();const user=await cloudUser();if(!fb||!user)return null;try{const snap=await getDoc(doc(fb.db,"users",user.uid));return snap.exists()?((snap.data().profile||null) as BetaProfile|null):null}catch{return null}}

export async function uploadBetaMediaCloud(key:BetaMediaKey,file:Blob,fileName?:string){const fb=getLookGoFirebase();const user=await cloudUser();if(!fb||!user)return null;try{const safe=(fileName||key).replace(/[^a-zA-Z0-9._-]/g,"_");const folder=key.startsWith("video")?"runways":key.startsWith("tryon")?"tryons":"reference";const objectRef=ref(fb.storage,`users/${user.uid}/${folder}/${key}-${Date.now()}-${safe}`);await uploadBytes(objectRef,file,{contentType:file.type||"application/octet-stream"});const url=await getDownloadURL(objectRef);const userRef=doc(fb.db,"users",user.uid);await setDoc(userRef,{updatedAt:serverTimestamp(),beta:true},{merge:true});await updateDoc(userRef,{[`media.${key}`]:{url,name:fileName||safe,updatedAt:new Date().toISOString(),type:file.type||"application/octet-stream"}});return url}catch{return null}}
export async function readBetaMediaCloud(key:BetaMediaKey):Promise<{blob:Blob;name:string;url:string}|null>{const fb=getLookGoFirebase();const user=await cloudUser();if(!fb||!user)return null;try{const snap=await getDoc(doc(fb.db,"users",user.uid));if(!snap.exists())return null;const media=snap.data().media as Record<string,{url?:string;name?:string}>|undefined;const item=media?.[key];if(!item?.url)return null;const response=await fetch(item.url,{cache:"no-store"});if(!response.ok)return null;return {blob:await response.blob(),name:item.name||key,url:item.url}}catch{return null}}

export async function saveBetaHistoryCloud(kind:"tryon"|"runway"|"profile"|"event",payload:Record<string,unknown>){const fb=getLookGoFirebase();const user=await cloudUser();if(!fb||!user)return false;try{await addDoc(collection(fb.db,"users",user.uid,"history"),{kind,...payload,createdAt:serverTimestamp()});return true}catch{return false}}
export async function readBetaHistoryCloud(max=30){const fb=getLookGoFirebase();const user=await cloudUser();if(!fb||!user)return [] as Array<Record<string,unknown>>;try{const snap=await getDocs(query(collection(fb.db,"users",user.uid,"history"),orderBy("createdAt","desc"),limit(max)));return snap.docs.map(d=>({id:d.id,...d.data()}))}catch{return [] as Array<Record<string,unknown>>}}
