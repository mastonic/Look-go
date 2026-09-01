import { NextResponse } from "next/server";

export const runtime="nodejs";

const FOLDERS:Record<string,string>={
 portrait:"reference",
 fullBody:"reference",
 profileState:"reference",
 wardrobeScan:"wardrobe",
 tryonSignature:"tryons",
 tryonBalance:"tryons",
 tryonSmart:"tryons",
 weddingTryonSignature:"tryons",
 weddingTryonBalance:"tryons",
 weddingTryonSmart:"tryons",
 videoSignature:"runways",
 videoBalance:"runways",
 videoSmart:"runways",
 weddingVideoSignature:"runways",
 weddingVideoBalance:"runways",
 weddingVideoSmart:"runways",
};

function storageBucket(){return String(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET||"").trim().replace(/^gs:\/\//,"")}
function tokenFrom(request:Request){const raw=request.headers.get("authorization")||"";return raw.replace(/^Bearer\s+/i,"").trim()}
function clean(value:string){return value.replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,160)}
function validUid(value:string){return /^[A-Za-z0-9_-]{6,160}$/.test(value)}

export async function POST(request:Request){
 try{
  const bucket=storageBucket();const token=tokenFrom(request);
  if(!bucket)return NextResponse.json({error:"Firebase Storage n’est pas configuré."},{status:503});
  if(!token)return NextResponse.json({error:"Session Firebase absente."},{status:401});
  const form=await request.formData();
  const file=form.get("file");const key=String(form.get("key")||"");const uid=String(form.get("uid")||"");const requestedName=String(form.get("fileName")||key);
  if(!(file instanceof File))return NextResponse.json({error:"Fichier manquant."},{status:400});
  const folder=FOLDERS[key];if(!folder)return NextResponse.json({error:"Type de média invalide."},{status:400});
  if(!validUid(uid))return NextResponse.json({error:"Identifiant utilisateur invalide."},{status:400});
  const isVideo=folder==="runways";const validType=isVideo?file.type.startsWith("video/"):file.type.startsWith("image/");
  if(!validType)return NextResponse.json({error:"Type de fichier invalide."},{status:400});
  const max=isVideo?120*1024*1024:12*1024*1024;if(file.size>max)return NextResponse.json({error:"Fichier trop volumineux."},{status:413});
  const safeName=clean(requestedName||key)||key;
  const path=key==="profileState"?`users/${uid}/reference/profile-state-v1.dat`:`users/${uid}/${folder}/${key}-${Date.now()}-${safeName}`;
  const target=`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?name=${encodeURIComponent(path)}`;
  const response=await fetch(target,{method:"POST",headers:{Authorization:`Firebase ${token}`,"Content-Type":file.type||"application/octet-stream"},body:Buffer.from(await file.arrayBuffer()),cache:"no-store"});
  const text=await response.text();
  if(!response.ok){console.error("FIREBASE_STORAGE_PROXY_UPLOAD_FAILED",response.status,text.slice(0,600));return NextResponse.json({error:"Le stockage cloud a refusé l’envoi.",status:response.status},{status:response.status>=400&&response.status<600?response.status:502})}
  let data:Record<string,unknown>={};try{data=JSON.parse(text)}catch{}
  return NextResponse.json({ok:true,path:String(data.name||path),bucket});
 }catch(error){console.error("FIREBASE_STORAGE_PROXY_UPLOAD_ERROR",error);return NextResponse.json({error:"Envoi cloud indisponible."},{status:502})}
}
