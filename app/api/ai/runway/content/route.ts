import { NextResponse } from "next/server";

export const runtime="nodejs";
export const maxDuration=60;
const GOOGLE_BASE="https://generativelanguage.googleapis.com/v1beta";

function googleOperation(id:string){if(!id.startsWith("google_"))return "";try{return Buffer.from(id.slice(7),"base64url").toString("utf8")}catch{return ""}}
function findVideoUri(value:unknown):string{if(!value||typeof value!=="object")return "";const obj=value as Record<string,unknown>;if(typeof obj.uri==="string"&&/^https:\/\//.test(obj.uri))return obj.uri;for(const child of Object.values(obj)){if(Array.isArray(child)){for(const item of child){const found=findVideoUri(item);if(found)return found}}else if(child&&typeof child==="object"){const found=findVideoUri(child);if(found)return found}}return ""}

export async function GET(request:Request){
 const id=new URL(request.url).searchParams.get("id")||"";const operation=googleOperation(id);
 if(operation){
  const key=process.env.GOOGLE_AI_API_KEY;if(!key)return NextResponse.json({error:"Le moteur vidéo Google n'est pas configuré."},{status:503});
  try{const status=await fetch(`${GOOGLE_BASE}/${operation}`,{headers:{"x-goog-api-key":key},cache:"no-store"});const data=await status.json().catch(()=>({}));if(!status.ok)return NextResponse.json({error:"Impossible de récupérer le résultat vidéo Google."},{status:502});if(!data?.done)return NextResponse.json({error:"La vidéo n'est pas encore disponible."},{status:425});if(data?.error)return NextResponse.json({error:String(data.error?.message||"La génération vidéo Google a échoué.")},{status:502});const uri=findVideoUri(data?.response);if(!uri)return NextResponse.json({error:"Aucun fichier vidéo n’a été renvoyé par Google."},{status:502});const response=await fetch(uri,{headers:{"x-goog-api-key":key},redirect:"follow",cache:"no-store"});if(!response.ok)return NextResponse.json({error:"La vidéo Google n'est plus disponible."},{status:502});const bytes=await response.arrayBuffer();return new Response(bytes,{status:200,headers:{"content-type":response.headers.get("content-type")||"video/mp4","cache-control":"private, no-store","content-disposition":`inline; filename="lookgo-runway-google.mp4"`}})}catch(error){console.error("Google runway content error",error);return NextResponse.json({error:"Erreur pendant la récupération du défilé Google."},{status:500})}
 }
 if(!/^video_[A-Za-z0-9_-]+$/.test(id))return NextResponse.json({error:"Identifiant vidéo invalide."},{status:400});
 const key=process.env.OPENAI_API_KEY;if(!key)return NextResponse.json({error:"Le moteur vidéo OpenAI n'est pas configuré."},{status:503});
 try{const response=await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(id)}/content`,{headers:{Authorization:`Bearer ${key}`},cache:"no-store"});if(!response.ok)return NextResponse.json({error:"La vidéo n'est pas encore disponible."},{status:502});const bytes=await response.arrayBuffer();return new Response(bytes,{status:200,headers:{"content-type":response.headers.get("content-type")||"video/mp4","cache-control":"private, no-store","content-disposition":`inline; filename="lookgo-runway-${id}.mp4"`}})}catch(error){console.error("Runway content route error",error);return NextResponse.json({error:"Erreur pendant la récupération du défilé."},{status:500})}
}
