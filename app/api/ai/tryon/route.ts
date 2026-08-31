import { NextResponse } from "next/server";
import { activeProviders } from "@/lib/ai/providers";
import { buildAiCostMeta } from "@/lib/ai/costs";

export const runtime="nodejs";
export const maxDuration=60;

const TIERS=new Set(["signature","balance","smart"]);
const OPEN_WARDROBE=["trousers","jeans","skirt","dress","bodysuit","shorts","jumpsuit","matching set","tailored suit","shirt-and-skirt look","layered separates"];
const PROVIDER_TIMEOUT_MS=25_000;

function tierDirection(tier:string){if(tier==="signature")return "premium fashion direction, refined fabrics, elevated tailoring, sophisticated accessories";if(tier==="smart")return "accessible fashion direction, versatile pieces, strong value for money, clean styling";return "balanced contemporary fashion direction, polished but attainable, strong style-to-price balance"}
function selectedSilhouette(tier:string,garments:string[]){const pool=garments.length?garments:OPEN_WARDROBE;const offset=tier==="signature"?0:tier==="balance"?1:2;return pool[offset%pool.length]}
function fileToBase64(file:File){return file.arrayBuffer().then(buffer=>Buffer.from(buffer).toString("base64"))}
function findImageData(value:unknown):{data:string;mime:string}|null{if(!value||typeof value!=="object")return null;const obj=value as Record<string,unknown>;const data=typeof obj.data==="string"?obj.data:"";const mime=typeof obj.mime_type==="string"?obj.mime_type:typeof obj.mimeType==="string"?obj.mimeType:"";if(data&&mime.startsWith("image/"))return {data,mime};for(const child of Object.values(obj)){if(Array.isArray(child)){for(const item of child){const found=findImageData(item);if(found)return found}}else if(child&&typeof child==="object"){const found=findImageData(child);if(found)return found}}return null}
async function fetchTimed(url:string,init:RequestInit,timeout=PROVIDER_TIMEOUT_MS){const controller=new AbortController();const id=setTimeout(()=>controller.abort(),timeout);try{return await fetch(url,{...init,signal:controller.signal})}finally{clearTimeout(id)}}
function trendDirection(value:string,boldness:number){
 const level=boldness<=30?"conservative and easy to wear":boldness>=70?"fashion-forward and willing to use stronger proportions, layering and accessories":"current but wearable";
 if(value==="trend")return `Prioritize genuinely contemporary fashion language for the current season: modern proportions, current styling, relevant layering, footwear and accessories. Keep it ${level}. Avoid dated combinations and generic catalogue styling.`;
 if(value==="timeless")return `Prioritize timeless, elegant and season-spanning styling rather than micro-trends. Keep it ${level}, polished and modern without looking dated.`;
 if(value==="balanced")return `Use current fashion cues selectively, keeping the result highly wearable and realistic. Keep it ${level}.`;
 return `Balance the customer's personal style with current fashion cues, without forcing micro-trends. Keep it ${level}.`;
}
function fashionTrendContext(){
 const now=new Date();const year=now.getUTCFullYear();const month=now.getUTCMonth()+1;const season=month>=3&&month<=5?"Spring":month>=6&&month<=8?"Summer":month>=9&&month<=11?"Autumn":"Winter";
 const injected=(process.env.LOOKGO_FASHION_TREND_CONTEXT||"").trim();
 return injected||`${season} ${year} context. Use contemporary silhouettes and proportions appropriate to this season. Do not invent named trends, product availability, prices or brand collaborations. If uncertain, favor modern, wearable styling over speculative micro-trends.`;
}

async function generateWithGoogle(prompt:string,portrait:File,fullBody:File){const key=process.env.GOOGLE_AI_API_KEY;if(!key)throw new Error("GOOGLE_NOT_CONFIGURED");const [portrait64,body64]=await Promise.all([fileToBase64(portrait),fileToBase64(fullBody)]);const model=process.env.GOOGLE_IMAGE_MODEL||"gemini-3.1-flash-image";const response=await fetchTimed("https://generativelanguage.googleapis.com/v1beta/interactions",{method:"POST",headers:{"x-goog-api-key":key,"Content-Type":"application/json"},body:JSON.stringify({model,input:[{type:"text",text:prompt},{type:"image",mime_type:portrait.type||"image/jpeg",data:portrait64},{type:"image",mime_type:fullBody.type||"image/jpeg",data:body64}],response_format:{type:"image",aspect_ratio:"2:3",image_size:"1K"}})});const data=await response.json().catch(()=>({}));if(!response.ok){console.error("Google Try-On failed",response.status,JSON.stringify(data).slice(0,1000));if(response.status===429)throw new Error("GOOGLE_QUOTA");if(response.status===401||response.status===403)throw new Error("GOOGLE_AUTH");throw new Error(`GOOGLE_HTTP_${response.status}`)}const image=findImageData(data);if(!image)throw new Error("GOOGLE_NO_IMAGE");return {image:`data:${image.mime};base64,${image.data}`,model,provider:"google"}}

async function generateWithOpenAI(prompt:string,portrait:File,fullBody:File){const key=process.env.OPENAI_API_KEY;if(!key)throw new Error("OPENAI_NOT_CONFIGURED");const model=process.env.OPENAI_IMAGE_MODEL||"gpt-image-2";const body=new FormData();body.append("model",model);body.append("prompt",prompt);body.append("size","1024x1536");body.append("quality",process.env.OPENAI_IMAGE_QUALITY||"medium");body.append("image[]",portrait,portrait.name||"portrait.jpg");body.append("image[]",fullBody,fullBody.name||"full-body.jpg");const response=await fetchTimed("https://api.openai.com/v1/images/edits",{method:"POST",headers:{Authorization:`Bearer ${key}`},body});const data=await response.json().catch(()=>({}));if(!response.ok){console.error("OpenAI Try-On failed",response.status,JSON.stringify(data).slice(0,1000));if(response.status===429)throw new Error("OPENAI_QUOTA");if(response.status===401||response.status===403)throw new Error("OPENAI_AUTH");throw new Error(`OPENAI_HTTP_${response.status}`)}const item=data?.data?.[0];if(item?.b64_json)return {image:`data:image/png;base64,${item.b64_json}`,model,provider:"openai"};if(item?.url)return {image:item.url,model,provider:"openai"};throw new Error("OPENAI_NO_IMAGE")}

export async function POST(request:Request){
 const requestStarted=Date.now();
 try{
  const incoming=await request.formData();const portrait=incoming.get("portrait");const fullBody=incoming.get("fullBody");const tier=String(incoming.get("tier")||"").toLowerCase();const profile=String(incoming.get("profile")||"{}");
  if(!(portrait instanceof File)||!(fullBody instanceof File))return NextResponse.json({error:"Le portrait et la photo plein pied sont obligatoires."},{status:400});
  if(!TIERS.has(tier))return NextResponse.json({error:"Niveau de look invalide."},{status:400});
  if(!portrait.type.startsWith("image/")||!fullBody.type.startsWith("image/"))return NextResponse.json({error:"Les deux fichiers doivent être des images."},{status:400});
  if(portrait.size>10_000_000||fullBody.size>10_000_000)return NextResponse.json({error:"Chaque photo doit faire moins de 10 Mo."},{status:400});
  let parsed:Record<string,unknown>={};try{parsed=JSON.parse(profile)}catch{}
  const list=(key:string)=>Array.isArray(parsed[key])?(parsed[key] as unknown[]).map(String).filter(Boolean):[];
  const styles=list("styles"),colors=list("likedColors"),avoided=list("avoidColors"),garments=list("garmentTypes"),occasions=list("occasions"),preferredBrands=list("brands");
  const avoidedBrands=String(parsed.avoidBrands||"").split(/[,;·]/).map(x=>x.trim()).filter(Boolean);
  const silhouette=selectedSilhouette(tier,garments);const wedding=occasions.some(x=>x.toLowerCase().includes("mariée")||x.toLowerCase().includes("mariage"));
  const trendPreference=String(parsed.trendPreference||"personalized");const trendBoldness=Math.max(0,Math.min(100,Number(parsed.trendBoldness??50)));
  const prompt=[
   "Create a photorealistic full-body virtual try-on fashion visualization of the exact same adult person shown in the two supplied reference images.",
   "Image 1 is the portrait identity anchor. Image 2 is the full-body morphology and proportion anchor.",
   "Preserve facial identity, skin tone, hairstyle, apparent age, body proportions, height impression and morphology exactly. Do not beautify, slim, enlarge, reshape, de-age or replace the person.",
   "Keep anatomy realistic, hands natural, and show the whole body from head to shoes.",
   `Customer age: ${String(parsed.age||"unknown")}. Do not stereotype by age; use it only to avoid obviously mismatched styling when combined with the customer's explicit preferences.`,
   `Customer measurements when available: height ${String(parsed.height||"unknown")} cm, weight ${String(parsed.weight||"unknown")} kg. Use these only as supporting proportion cues together with the full-body reference; never infer health or alter morphology.`,
   `Usual sizes: top ${String(parsed.topSize||"unknown")}, bottom ${String(parsed.bottomSize||"unknown")}, shoes ${String(parsed.shoeSize||"unknown")}.`,
   `Fashion preference: ${trendPreference}. Boldness: ${trendBoldness}/100. ${trendDirection(trendPreference,trendBoldness)}`,
   `Fashion trend context: ${fashionTrendContext()}`,
   `Create a ${tierDirection(tier)}. Preferred styles: ${styles.join(", ")||"open contemporary fashion"}. Preferred colors: ${colors.join(", ")||"harmonious colors"}. Avoid colors: ${avoided.join(", ")||"none"}.`,
   preferredBrands.length?`Preferred brands as style references only: ${preferredBrands.join(", ")}. Capture compatible design language without copying logos, trademarks, exact products or claiming commercial availability.`:"No preferred-brand constraint.",
   avoidedBrands.length?`Avoid visual references associated with these brands or retailers: ${avoidedBrands.join(", ")}. Do not mention or depict their logos.`:"No avoided-brand constraint.",
   `For this generation, use a ${silhouette} as the main garment silhouette. Do not default to trousers when another selected silhouette is requested.`,
   garments.length?`The customer explicitly wants to explore these garment categories: ${garments.join(", ")}. Treat skirts, dresses, bodysuits, shorts, jumpsuits, sets and tailoring as equally valid choices when selected.`:"The customer left garment type open. Explore the full wardrobe and vary silhouettes rather than repeatedly defaulting to trousers.",
   occasions.length?`Intended occasions/univers: ${occasions.join(", ")}.`:"No specific occasion restriction.",
   wedding?"Wedding styling is explicitly enabled by the customer. If the selected occasion is bridal, a bridal gown or modern bridal alternative is allowed; if wedding guest, create an appropriate guest look. Do not assume bridal styling unless selected.":"Do not introduce bridal styling unless the customer explicitly selects it.",
   `Budget guidance: ${String(parsed.budget||"unknown")} EUR, priority ${String(parsed.budgetMode||tier)}. Keep the visual direction coherent with that positioning without claiming exact retail prices.`,
   "This is a style visualization, not a claim that any specific garment is an exact purchasable product. Do not generate product labels, prices, SKUs, availability claims or retailer URLs. Neutral premium studio background, natural editorial lighting, realistic fabric drape."
  ].join(" ");
  const providers=activeProviders("image");if(!providers.length)return NextResponse.json({error:"Aucun moteur d’image actif n’est configuré."},{status:503});
  const errors:string[]=[];
  for(const provider of providers){const started=Date.now();try{let result:{image:string;model:string;provider:string}|null=null;if(provider.id==="google")result=await generateWithGoogle(prompt,portrait,fullBody);else if(provider.id==="openai")result=await generateWithOpenAI(prompt,portrait,fullBody);else continue;if(result){const meta=buildAiCostMeta(result.provider,result.model,"image",Date.now()-started);console.info("TRYON_SUCCESS",JSON.stringify({tier,silhouette,trendPreference,trendBoldness,...meta,totalDurationMs:Date.now()-requestStarted}));return NextResponse.json({...result,tier,silhouette,trendPreference,trendBoldness,meta})}}catch(error){const code=error instanceof Error?(error.name==="AbortError"?`${provider.id.toUpperCase()}_TIMEOUT`:error.message):"PROVIDER_ERROR";errors.push(`${provider.id}:${code}`);console.error("Try-On provider failed",provider.id,code,Date.now()-started)}}
  console.error("All active Try-On providers failed",errors.join(","));const quotaOnly=errors.length>0&&errors.every(x=>x.includes("QUOTA"));return NextResponse.json({error:quotaOnly?"Les crédits du moteur IA sont temporairement épuisés. Réessayez plus tard ou activez un autre fournisseur.":"La génération est temporairement indisponible. Réessayez dans quelques instants.",codes:process.env.NODE_ENV==="development"?errors:undefined},{status:quotaOnly?429:502});
 }catch(error){console.error("Try-On route error",error);return NextResponse.json({error:"Erreur serveur pendant la génération IA."},{status:500})}
}
