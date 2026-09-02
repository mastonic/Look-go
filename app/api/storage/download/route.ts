import { NextResponse } from "next/server";

export const runtime="nodejs";

function storageBuckets(){
 const configured=String(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET||"").trim().replace(/^gs:\/\//,"");
 const project=String(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID||"").trim();
 const candidates=[
  configured,
  configured.endsWith(".appspot.com")?configured.replace(/\.appspot\.com$/,".firebasestorage.app"):"",
  configured.endsWith(".firebasestorage.app")?configured.replace(/\.firebasestorage\.app$/,".appspot.com"):"",
  project?`${project}.firebasestorage.app`:"",
  project?`${project}.appspot.com`:"",
 ].filter(Boolean);
 return Array.from(new Set(candidates));
}
function tokenFrom(request:Request){const raw=request.headers.get("authorization")||"";return raw.replace(/^Bearer\s+/i,"").trim()}
function validPath(path:string){return /^users\/[A-Za-z0-9_-]{6,160}\/(reference|wardrobe|tryons|runways)\/[^/]{1,220}$/.test(path)}

export async function GET(request:Request){
 try{
  const buckets=storageBuckets();const token=tokenFrom(request);const url=new URL(request.url);const path=String(url.searchParams.get("path")||"");
  if(!buckets.length)return NextResponse.json({error:"Firebase Storage n’est pas configuré."},{status:503});
  if(!token)return NextResponse.json({error:"Session Firebase absente."},{status:401});
  if(!validPath(path))return NextResponse.json({error:"Chemin de média invalide."},{status:400});
  let lastStatus=404;let lastText="Not Found";
  for(const bucket of buckets){
   const target=`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(path)}?alt=media`;
   const response=await fetch(target,{headers:{Authorization:`Firebase ${token}`},cache:"no-store"});
   if(response.ok){const headers=new Headers();headers.set("content-type",response.headers.get("content-type")||"application/octet-stream");headers.set("cache-control","private, no-store, max-age=0");const length=response.headers.get("content-length");if(length)headers.set("content-length",length);return new Response(response.body,{status:200,headers});}
   const responseText=await response.text();lastStatus=response.status;lastText=responseText;
   if(response.status!==404){console.error("FIREBASE_STORAGE_PROXY_DOWNLOAD_FAILED",response.status,responseText.slice(0,600));return NextResponse.json({error:"Média cloud indisponible.",status:response.status},{status:response.status>=400&&response.status<600?response.status:502});}
  }
  console.error("FIREBASE_STORAGE_PROXY_DOWNLOAD_FAILED",lastStatus,lastText.slice(0,600),"bucket_candidates",buckets.length);
  return NextResponse.json({error:"Média cloud indisponible.",status:lastStatus},{status:404});
 }catch(error){console.error("FIREBASE_STORAGE_PROXY_DOWNLOAD_ERROR",error);return NextResponse.json({error:"Lecture cloud indisponible."},{status:502})}
}
