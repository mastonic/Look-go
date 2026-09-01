import { NextResponse } from "next/server";
import { brandsForTier, findMerchantByUrl, type MerchantBrand } from "@/lib/commerce/brands";
import { searchMiyami } from "@/lib/commerce/miyami";
import { buildSizeSearchTerms, sizeAdvice } from "@/lib/commerce/sizing";

export const runtime="nodejs";
export const maxDuration=25;

type SearchBody={query?:string;tier?:"signature"|"balance"|"smart";brands?:string[];maxPrice?:number;topSize?:string;bottomSize?:string;shoeSize?:string;limit?:number};
type CommerceResult={title:string;description:string;url:string;merchant:{id:string;name:string;tier:string};directMerchantLink:boolean;fallback:boolean;searchProvider?:"miyami"|"brave"};

function cleanText(value:unknown,max=180){return String(value||"").replace(/\s+/g," ").trim().slice(0,max)}
function hostQuery(domains:string[]){return domains.slice(0,8).map(d=>`site:${d}`).join(" OR ")}
function merchantFallback(merchant:MerchantBrand,query:string):CommerceResult{return {title:`Rechercher « ${query} » chez ${merchant.name}`,description:`Ouvrez ${merchant.name} pour retrouver une pièce proche du look. Prix, taille et stock sont à vérifier directement chez le marchand.`,url:merchant.home,merchant:{id:merchant.id,name:merchant.name,tier:merchant.tier},directMerchantLink:false,fallback:true}}
function providerError(error:unknown){return error instanceof Error?error.message:String(error||"unknown")}
function resultFromSearch(input:{title:unknown;description:unknown;url:unknown},selectedIds:Set<string>,provider:"miyami"|"brave"):CommerceResult|null{
 const url=cleanText(input.url,1200);if(!url)return null;
 const merchant=findMerchantByUrl(url);if(!merchant||!selectedIds.has(merchant.id))return null;
 const title=cleanText(input.title,180);if(!title)return null;
 return {title,description:cleanText(input.description,320),url,merchant:{id:merchant.id,name:merchant.name,tier:merchant.tier},directMerchantLink:true,fallback:false,searchProvider:provider};
}
function uniqueResults(results:CommerceResult[],limit:number){const seen=new Set<string>();return results.filter(item=>{const key=item.url.replace(/[?#].*$/,"").replace(/\/$/,"").toLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true}).slice(0,limit)}

async function searchWithMiyami(q:string,selected:MerchantBrand[],limit:number){
 const selectedIds=new Set(selected.map(item=>item.id));
 const response=await searchMiyami(q);
 const results=response.hits.map(hit=>resultFromSearch({title:hit.title,description:hit.content,url:hit.url},selectedIds,"miyami")).filter((item):item is CommerceResult=>Boolean(item));
 console.info("COMMERCE_SEARCH_MIYAMI",JSON.stringify({durationMs:response.durationMs,raw:response.hits.length,accepted:results.length,tier:selected[0]?.tier}));
 return uniqueResults(results,limit);
}

async function searchWithBrave(q:string,selected:MerchantBrand[],limit:number,key:string){
 const endpoint=new URL("https://api.search.brave.com/res/v1/web/search");endpoint.searchParams.set("q",q);endpoint.searchParams.set("count",String(Math.min(20,Math.max(5,limit))));endpoint.searchParams.set("safesearch","moderate");endpoint.searchParams.set("country","fr");endpoint.searchParams.set("search_lang","fr");
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch(endpoint,{headers:{Accept:"application/json","X-Subscription-Token":key},signal:controller.signal,cache:"no-store"});
  const data=await response.json().catch(()=>({})) as {web?:{results?:Array<Record<string,unknown>>}};
  if(!response.ok)throw new Error(`Brave HTTP ${response.status}`);
  const selectedIds=new Set(selected.map(item=>item.id));
  const raw=Array.isArray(data.web?.results)?data.web.results:[];
  const results=raw.map(item=>resultFromSearch({title:item.title,description:item.description,url:item.url},selectedIds,"brave")).filter((item):item is CommerceResult=>Boolean(item));
  return uniqueResults(results,limit);
 }finally{clearTimeout(timer)}
}

export async function POST(request:Request){
 try{
  const body=await request.json() as SearchBody;
  const query=cleanText(body.query,120);if(!query)return NextResponse.json({error:"Décrivez le vêtement recherché."},{status:400});
  const all=brandsForTier(body.tier);const wanted=(body.brands||[]).map(x=>x.toLowerCase());const selected=wanted.length?all.filter(b=>wanted.includes(b.id)||wanted.includes(b.name.toLowerCase())):all;
  if(!selected.length)return NextResponse.json({error:"Aucune marque compatible avec ce filtre."},{status:400});
  const sizeTerms=buildSizeSearchTerms({top:body.topSize,bottom:body.bottomSize,shoe:body.shoeSize});
  const price=Number(body.maxPrice||0)>0?`moins de ${Math.round(Number(body.maxPrice))} EUR`:"";
  const q=[`vêtement femme ${query}`,body.tier?`style ${body.tier}`:"",price,sizeTerms.slice(0,3).join(" "),`(${hostQuery(selected.map(b=>b.domain))})`].filter(Boolean).join(" ");
  const limit=Math.min(20,Math.max(3,Number(body.limit||10)));
  const providerAttempts:string[]=[];

  try{
   providerAttempts.push("miyami");
   const miyamiResults=await searchWithMiyami(q,selected,limit);
   if(miyamiResults.length)return NextResponse.json({query:q,results:miyamiResults,fallback:false,provider:"miyami",providerAttempts,size:sizeAdvice({top:body.topSize,bottom:body.bottomSize,shoe:body.shoeSize}),disclaimer:"Résultats trouvés via Miyami/SearXNG puis limités aux marchands Look&Go. Prix, tailles et stocks doivent être vérifiés sur la page marchand."});
   console.warn("COMMERCE_SEARCH_MIYAMI_EMPTY",JSON.stringify({tier:body.tier,query}));
  }catch(error){console.warn("COMMERCE_SEARCH_MIYAMI_FAILURE",JSON.stringify({tier:body.tier,error:providerError(error)}));}

  const braveKey=process.env.BRAVE_SEARCH_API_KEY;
  if(braveKey){
   try{
    providerAttempts.push("brave");
    const braveResults=await searchWithBrave(q,selected,limit,braveKey);
    if(braveResults.length)return NextResponse.json({query:q,results:braveResults,fallback:false,provider:"brave",providerAttempts,size:sizeAdvice({top:body.topSize,bottom:body.bottomSize,shoe:body.shoeSize}),disclaimer:"Miyami n’a pas retourné de résultat exploitable ; Look&Go a utilisé son fournisseur de secours. Prix, tailles et stocks doivent être vérifiés chez le marchand."});
   }catch(error){console.warn("COMMERCE_SEARCH_BRAVE_FAILURE",JSON.stringify({tier:body.tier,error:providerError(error)}));}
  }

  providerAttempts.push("merchant-directory");
  const results=selected.slice(0,Math.min(limit,4)).map(merchant=>merchantFallback(merchant,query));
  console.warn("COMMERCE_SEARCH_FALLBACK",JSON.stringify({tier:body.tier,query,providerAttempts,results:results.length}));
  return NextResponse.json({query:q,results,fallback:true,provider:"merchant-directory",providerAttempts,size:sizeAdvice({top:body.topSize,bottom:body.bottomSize,shoe:body.shoeSize}),disclaimer:"Aucun article précis n’a pu être confirmé par les moteurs de recherche. Look&Go propose des accès directs aux marchands compatibles sans inventer de produit, prix ou stock."});
 }catch(error){console.error("Commerce search error",error);return NextResponse.json({error:"Erreur pendant la recherche de vêtements."},{status:500})}
}
