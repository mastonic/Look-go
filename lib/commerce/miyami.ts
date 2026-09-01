export type MiyamiSearchHit={
 title:string;
 url:string;
 content:string;
 engine?:string;
 score?:number;
};

export type MiyamiSearchResponse={
 query?:string;
 number_of_results?:number;
 results?:Array<{
  title?:unknown;
  url?:unknown;
  content?:unknown;
  description?:unknown;
  engine?:unknown;
  score?:unknown;
 }>;
};

const DEFAULT_MIYAMI_URL="https://websearch.miyami.tech";

function text(value:unknown,max:number){return String(value??"").replace(/\s+/g," ").trim().slice(0,max)}
function timeoutMs(){const configured=Number(process.env.MIYAMI_SEARCH_TIMEOUT_MS||9000);return Number.isFinite(configured)?Math.min(15000,Math.max(2500,configured)):9000}

export function miyamiBaseUrl(){
 const raw=(process.env.MIYAMI_SEARCH_API_URL||DEFAULT_MIYAMI_URL).trim();
 const url=new URL(raw);
 if(url.protocol!=="https:"&&url.protocol!=="http:")throw new Error("MIYAMI_SEARCH_API_URL must use http or https");
 return url.toString().replace(/\/$/,"");
}

export async function searchMiyami(query:string):Promise<{hits:MiyamiSearchHit[];durationMs:number;endpoint:string}>{
 const base=miyamiBaseUrl();
 const endpoint=new URL(`${base}/search-api`);
 endpoint.searchParams.set("query",query);
 endpoint.searchParams.set("categories","general");
 endpoint.searchParams.set("language","fr");
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs());
 const started=Date.now();
 try{
  const response=await fetch(endpoint,{headers:{Accept:"application/json","User-Agent":"LookAndGo-Commerce/1.0"},signal:controller.signal,cache:"no-store"});
  if(!response.ok)throw new Error(`Miyami HTTP ${response.status}`);
  const data=await response.json() as MiyamiSearchResponse;
  const hits=(Array.isArray(data.results)?data.results:[]).map(item=>({
   title:text(item.title,180),
   url:text(item.url,1200),
   content:text(item.content||item.description,360),
   engine:text(item.engine,60)||undefined,
   score:Number.isFinite(Number(item.score))?Number(item.score):undefined
  })).filter(item=>item.title&&item.url);
  return {hits,durationMs:Date.now()-started,endpoint:base};
 }finally{clearTimeout(timer)}
}
