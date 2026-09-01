import { NextResponse } from "next/server";
import { brandsForTier, findMerchantByUrl, type MerchantBrand } from "@/lib/commerce/brands";
import { buildSizeSearchTerms, sizeAdvice } from "@/lib/commerce/sizing";

export const runtime="nodejs";
export const maxDuration=20;

type SearchBody={query?:string;tier?:"signature"|"balance"|"smart";brands?:string[];maxPrice?:number;topSize?:string;bottomSize?:string;shoeSize?:string;limit?:number};

function cleanText(value:unknown,max=180){return String(value||"").replace(/\s+/g," ").trim().slice(0,max)}
function hostQuery(domains:string[]){return domains.slice(0,8).map(d=>`site:${d}`).join(" OR ")}
function merchantFallback(merchant:MerchantBrand,query:string){return {title:`Rechercher « ${query} » chez ${merchant.name}`,description:`Ouvrez ${merchant.name} pour retrouver une pièce proche du look. Prix, taille et stock sont à vérifier directement chez le marchand.`,url:merchant.home,merchant:{id:merchant.id,name:merchant.name,tier:merchant.tier},directMerchantLink:false,fallback:true}}

export async function POST(request:Request){
 try{
  const body=await request.json() as SearchBody;
  const query=cleanText(body.query,120);if(!query)return NextResponse.json({error:"Décrivez le vêtement recherché."},{status:400});
  const all=brandsForTier(body.tier);const wanted=(body.brands||[]).map(x=>x.toLowerCase());const selected=wanted.length?all.filter(b=>wanted.includes(b.id)||wanted.includes(b.name.toLowerCase())):all;
  if(!selected.length)return NextResponse.json({error:"Aucune marque compatible avec ce filtre."},{status:400});
  const sizeTerms=buildSizeSearchTerms({top:body.topSize,bottom:body.bottomSize,shoe:body.shoeSize});
  const price=Number(body.maxPrice||0)>0?`moins de ${Math.round(Number(body.maxPrice))} EUR`:"";
  const q=[`vêtement ${query}`,body.tier?`style ${body.tier}`:"",price,sizeTerms.slice(0,3).join(" "),`(${hostQuery(selected.map(b=>b.domain))})`].filter(Boolean).join(" ");
  const limit=Math.min(20,Math.max(3,Number(body.limit||10)));
  const key=process.env.BRAVE_SEARCH_API_KEY;
  if(!key){
   const results=selected.slice(0,Math.min(limit,4)).map(merchant=>merchantFallback(merchant,query));
   console.warn("COMMERCE_SEARCH_FALLBACK",JSON.stringify({reason:"BRAVE_SEARCH_API_KEY missing",tier:body.tier,query,results:results.length}));
   return NextResponse.json({query:q,results,fallback:true,provider:"merchant-directory",size:sizeAdvice({top:body.topSize,bottom:body.bottomSize,shoe:body.shoeSize}),disclaimer:"La recherche produit détaillée n’est pas encore activée. Look&Go propose temporairement des accès directs aux marchands compatibles, sans inventer de prix, stock ou article précis."});
  }
  const endpoint=new URL("https://api.search.brave.com/res/v1/web/search");endpoint.searchParams.set("q",q);endpoint.searchParams.set("count",String(Math.min(20,Math.max(5,limit))));endpoint.searchParams.set("safesearch","moderate");endpoint.searchParams.set("country","fr");endpoint.searchParams.set("search_lang","fr");
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10_000);let response:Response;try{response=await fetch(endpoint,{headers:{Accept:"application/json","X-Subscription-Token":key},signal:controller.signal,cache:"no-store"})}finally{clearTimeout(timer)}
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
   console.error("Commerce provider unavailable",response.status);
   const results=selected.slice(0,Math.min(limit,4)).map(merchant=>merchantFallback(merchant,query));
   return NextResponse.json({query:q,results,fallback:true,provider:"merchant-directory",providerStatus:response.status,size:sizeAdvice({top:body.topSize,bottom:body.bottomSize,shoe:body.shoeSize}),disclaimer:"La recherche produit détaillée est momentanément indisponible. Look&Go propose des accès directs aux marchands compatibles en attendant son rétablissement."});
  }
  const raw=Array.isArray(data?.web?.results)?data.web.results:[];
  const liveResults=raw.map((r:Record<string,unknown>)=>{const url=cleanText(r.url,1000);const merchant=findMerchantByUrl(url);if(!merchant)return null;return {title:cleanText(r.title,180),description:cleanText(r.description,320),url,merchant:{id:merchant.id,name:merchant.name,tier:merchant.tier},directMerchantLink:true,fallback:false}}).filter(Boolean).slice(0,limit);
  const results=liveResults.length?liveResults:selected.slice(0,Math.min(limit,4)).map(merchant=>merchantFallback(merchant,query));
  return NextResponse.json({query:q,results,fallback:!liveResults.length,provider:liveResults.length?"brave":"merchant-directory",size:sizeAdvice({top:body.topSize,bottom:body.bottomSize,shoe:body.shoeSize}),disclaimer:liveResults.length?"Les prix, tailles et stocks doivent être vérifiés sur la page marchand. Look&Go ne les invente pas.":"Aucun article précis n’a pu être confirmé. Look&Go propose des accès directs aux marchands compatibles sans inventer de produit."});
 }catch(error){console.error("Commerce search error",error);return NextResponse.json({error:"Erreur pendant la recherche de vêtements."},{status:500})}
}
