import { NextResponse } from "next/server";
import { findMerchantByUrl } from "@/lib/commerce/brands";

export const runtime="nodejs";
export const maxDuration=10;

export async function POST(request:Request){
 try{
  const {url}=await request.json() as {url?:string};
  if(!url)return NextResponse.json({error:"URL manquante."},{status:400});
  let parsed:URL;try{parsed=new URL(url)}catch{return NextResponse.json({error:"URL invalide."},{status:400})}
  if(parsed.protocol!=="https:")return NextResponse.json({error:"Seuls les liens HTTPS sont acceptés."},{status:400});
  const merchant=findMerchantByUrl(parsed.toString());if(!merchant)return NextResponse.json({valid:false,error:"Ce marchand n’est pas encore dans le catalogue Look&Go."},{status:400});
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6000);let reachable=false;let status=0;try{const res=await fetch(parsed,{method:"HEAD",redirect:"follow",signal:controller.signal,headers:{"user-agent":"LookAndGo-LinkValidator/1.0"},cache:"no-store"});status=res.status;reachable=res.ok||[401,403,405].includes(res.status)}catch{}finally{clearTimeout(timer)}
  return NextResponse.json({valid:true,reachable,status,url:parsed.toString(),merchant:{id:merchant.id,name:merchant.name,tier:merchant.tier},note:"Le lien est conservé tel quel : Look&Go ne remplace pas l’URL par un lien inventé."});
 }catch{return NextResponse.json({error:"Validation du lien impossible."},{status:500})}
}
