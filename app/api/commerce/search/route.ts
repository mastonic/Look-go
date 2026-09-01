import { NextResponse } from "next/server";
import { findMerchantByUrl, inferShoppingCategory, rankBrandsForShopping, type MerchantBrand } from "@/lib/commerce/brands";
import { searchMiyami } from "@/lib/commerce/miyami";
import { buildSizeSearchTerms, sizeAdvice } from "@/lib/commerce/sizing";

export const runtime="nodejs";
export const maxDuration=25;

type SearchBody={query?:string;tier?:"signature"|"balance"|"smart";brands?:string[];maxPrice?:number;topSize?:string;bottomSize?:string;shoeSize?:string;limit?:number};
type CommerceResult={title:string;description:string;url:string;merchant:{id:string;name:string;tier:string};directMerchantLink:boolean;fallback:boolean;searchProvider?:"miyami"|"brave";matchReason?:string;relevance?:number};

function cleanText(value:unknown,max=180){return String(value||"").replace(/\s+/g," ").trim().slice(0,max)}
function normalize(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function hostQuery(domains:string[]){return domains.slice(0,8).map(d=>`site:${d}`).join(" OR ")}
function merchantFallback(merchant:MerchantBrand,query:string,category:string):CommerceResult{return {title:`Rechercher « ${query} » chez ${merchant.name}`,description:`${merchant.name} est sélectionné pour cette recherche ${category!=="general"?`de type ${category}`:"mode"}. Ouvrez l’enseigne pour vérifier les modèles, prix, tailles et stocks disponibles.`,url:merchant.home,merchant:{id:merchant.id,name:merchant.name,tier:merchant.tier},directMerchantLink:false,fallback:true,matchReason:`Sélection ${category} · ${merchant.tier}`}}
function providerError(error:unknown){return error instanceof Error?error.message:String(error||"unknown")}
function queryTokens(query:string){const stop=new Set(["femme","pour","avec","sans","style","moins","eur","taille","look","tenue","une","des","les","dans","chez"]);return normalize(query).split(" ").filter(token=>token.length>2&&!stop.has(token)).slice(0,10)}
function relevanceScore(title:string,description:string,query:string,merchantRank:number){const haystack=normalize(`${title} ${description}`);const tokens=queryTokens(query);let score=0;tokens.forEach(token=>{if(haystack.includes(token))score+=1});return score+(1/Math.max(1,merchantRank+1))*.35}
function resultFromSearch(input:{title:unknown;description:unknown;url:unknown},selectedIds:Set<string>,rankMap:Map<string,number>,provider:"miyami"|"brave",query:string):CommerceResult|null{
 const url=cleanText(input.url,1200);if(!url)return null;
 const merchant=findMerchantByUrl(url);if(!merchant||!selectedIds.has(merchant.id))return null;
 const title=cleanText(input.title,180);if(!title)return null;
 const description=cleanText(input.description,320);
 const rank=rankMap.get(merchant.id)??99;
 return {title,description,url,merchant:{id:merchant.id,name:merchant.name,tier:merchant.tier},directMerchantLink:true,fallback:false,searchProvider:provider,relevance:relevanceScore(title,description,query,rank)};
}
function diverseResults(results:CommerceResult[],selected:MerchantBrand[],limit:number){
 const seen=new Set<string>();const unique=results.filter(item=>{const key=item.url.replace(/[?#].*$/,"").replace(/\/$/,"").toLowerCase();if(!key||seen.has(key))return false;seen.add(key);return true});
 unique.sort((a,b)=>(b.relevance||0)-(a.relevance||0));
 if(selected.length<=1)return unique.slice(0,limit);
 const byMerchant=new Map<string,CommerceResult[]>();unique.forEach(item=>{const list=byMerchant.get(item.merchant.id)||[];list.push(item);byMerchant.set(item.merchant.id,list)});
 const output:CommerceResult[]=[];const maxPerMerchant=Math.max(1,Math.min(2,Math.ceil(limit/Math.max(2,selected.length))));
 for(let round=0;round<maxPerMerchant&&output.length<limit;round++){
  for(const merchant of selected){const candidate=byMerchant.get(merchant.id)?.[round];if(candidate){output.push(candidate);if(output.length>=limit)break}}
 }
 if(output.length<limit){for(const item of unique){if(output.some(existing=>existing.url===item.url))continue;const used=output.filter(existing=>existing.merchant.id===item.merchant.id).length;if(used>=2)continue;output.push(item);if(output.length>=limit)break}}
 return output.slice(0,limit);
}

async function searchWithMiyami(baseQuery:string,selected:MerchantBrand[],limit:number,userQuery:string){
 const selectedIds=new Set(selected.map(item=>item.id));const rankMap=new Map(selected.map((item,index)=>[item.id,index]));const merchants=selected.slice(0,Math.min(6,selected.length));
 const attempts=await Promise.allSettled(merchants.map(async merchant=>({merchant,response:await searchMiyami(`${baseQuery} site:${merchant.domain}`)})));
 const results:CommerceResult[]=[];let raw=0;let durationMs=0;
 for(const attempt of attempts){if(attempt.status!=="fulfilled")continue;raw+=attempt.value.response.hits.length;durationMs=Math.max(durationMs,attempt.value.response.durationMs);for(const hit of attempt.value.response.hits){const item=resultFromSearch({title:hit.title,description:hit.content,url:hit.url},selectedIds,rankMap,"miyami",userQuery);if(item&&item.merchant.id===attempt.value.merchant.id)results.push(item)}}
 const balanced=diverseResults(results,selected,limit);
 console.info("COMMERCE_SEARCH_MIYAMI",JSON.stringify({durationMs,raw,accepted:results.length,balanced:balanced.length,merchants:merchants.map(item=>item.id)}));
 return balanced;
}

async function searchWithBrave(q:string,selected:MerchantBrand[],limit:number,key:string,userQuery:string){
 const endpoint=new URL("https://api.search.brave.com/res/v1/web/search");endpoint.searchParams.set("q",q);endpoint.searchParams.set("count",String(Math.min(20,Math.max(8,limit*2))));endpoint.searchParams.set("safesearch","moderate");endpoint.searchParams.set("country","fr");endpoint.searchParams.set("search_lang","fr");
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
 try{
  const response=await fetch(endpoint,{headers:{Accept:"application/json","X-Subscription-Token":key},signal:controller.signal,cache:"no-store"});
  const data=await response.json().catch(()=>({})) as {web?:{results?:Array<Record<string,unknown>>}};
  if(!response.ok)throw new Error(`Brave HTTP ${response.status}`);
  const selectedIds=new Set(selected.map(item=>item.id));const rankMap=new Map(selected.map((item,index)=>[item.id,index]));
  const raw=Array.isArray(data.web?.results)?data.web.results:[];
  const results=raw.map(item=>resultFromSearch({title:item.title,description:item.description,url:item.url},selectedIds,rankMap,"brave",userQuery)).filter((item):item is CommerceResult=>Boolean(item));
  return diverseResults(results,selected,limit);
 }finally{clearTimeout(timer)}
}

export async function POST(request:Request){
 try{
  const body=await request.json() as SearchBody;
  const query=cleanText(body.query,120);if(!query)return NextResponse.json({error:"Décrivez le vêtement recherché."},{status:400});
  const selected=rankBrandsForShopping({tier:body.tier,query,preferredBrands:body.brands||[]});
  if(!selected.length)return NextResponse.json({error:"Aucune enseigne compatible avec cette recherche."},{status:400});
  const category=inferShoppingCategory(query);
  const sizeTerms=buildSizeSearchTerms({top:body.topSize,bottom:body.bottomSize,shoe:body.shoeSize});
  const price=Number(body.maxPrice||0)>0?`moins de ${Math.round(Number(body.maxPrice))} EUR`:"";
  const baseQuery=[`mode femme ${query}`,price,sizeTerms.slice(0,3).join(" ")].filter(Boolean).join(" ");
  const limit=Math.min(20,Math.max(3,Number(body.limit||10)));
  const providerAttempts:string[]=[];

  try{
   providerAttempts.push("miyami");
   const miyamiResults=await searchWithMiyami(baseQuery,selected,limit,query);
   if(miyamiResults.length)return NextResponse.json({query:baseQuery,category,merchantOrder:selected.map(item=>item.name),results:miyamiResults,fallback:false,provider:"miyami",providerAttempts,size:sizeAdvice({top:body.topSize,bottom:body.bottomSize,shoe:body.shoeSize}),disclaimer:"Résultats recherchés séparément chez plusieurs enseignes pertinentes puis diversifiés par Look&Go. Prix, tailles et stocks doivent être vérifiés sur la page marchand."});
   console.warn("COMMERCE_SEARCH_MIYAMI_EMPTY",JSON.stringify({tier:body.tier,query,category}));
  }catch(error){console.warn("COMMERCE_SEARCH_MIYAMI_FAILURE",JSON.stringify({tier:body.tier,error:providerError(error)}));}

  const braveKey=process.env.BRAVE_SEARCH_API_KEY;
  if(braveKey){
   try{
    providerAttempts.push("brave");
    const braveQuery=[baseQuery,`(${hostQuery(selected.map(b=>b.domain))})`].filter(Boolean).join(" ");
    const braveResults=await searchWithBrave(braveQuery,selected,limit,braveKey,query);
    if(braveResults.length)return NextResponse.json({query:braveQuery,category,merchantOrder:selected.map(item=>item.name),results:braveResults,fallback:false,provider:"brave",providerAttempts,size:sizeAdvice({top:body.topSize,bottom:body.bottomSize,shoe:body.shoeSize}),disclaimer:"Miyami n’a pas retourné assez de résultats exploitables ; Look&Go a utilisé son fournisseur de secours puis diversifié les enseignes. Prix, tailles et stocks doivent être vérifiés chez le marchand."});
   }catch(error){console.warn("COMMERCE_SEARCH_BRAVE_FAILURE",JSON.stringify({tier:body.tier,error:providerError(error)}));}
  }

  providerAttempts.push("merchant-directory");
  const results=selected.slice(0,Math.min(limit,4)).map(merchant=>merchantFallback(merchant,query,category));
  console.warn("COMMERCE_SEARCH_FALLBACK",JSON.stringify({tier:body.tier,query,category,providerAttempts,merchants:results.map(item=>item.merchant.id)}));
  return NextResponse.json({query:baseQuery,category,merchantOrder:selected.map(item=>item.name),results,fallback:true,provider:"merchant-directory",providerAttempts,size:sizeAdvice({top:body.topSize,bottom:body.bottomSize,shoe:body.shoeSize}),disclaimer:"Aucun article précis n’a pu être confirmé par les moteurs. Look&Go propose plusieurs enseignes pertinentes pour la pièce recherchée, sans inventer de produit, prix ou stock."});
 }catch(error){console.error("Commerce search error",error);return NextResponse.json({error:"Erreur pendant la recherche de vêtements."},{status:500})}
}
