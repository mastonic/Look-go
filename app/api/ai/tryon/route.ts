import { NextResponse } from "next/server";
import { activeProviders } from "@/lib/ai/providers";
import { buildAiCostMeta } from "@/lib/ai/costs";

export const runtime="nodejs";
export const maxDuration=60;

const TIERS=new Set(["signature","balance","smart"]);
const ACTIONS=new Set(["default","full-length","multi-angle","recolor","variant"]);
const ANGLES=new Set(["front","three-quarter","back"]);
const OPEN_WARDROBE=["trousers","jeans","skirt","dress","bodysuit","shorts","jumpsuit","matching set","tailored suit","shirt-and-skirt look","layered separates"];
const WEDDING_FALLBACK_COLORS=["vert émeraude","rose poudré","bleu nuit","vert sauge","terracotta","prune","bleu pétrole","lavande grisée","cuivre rosé","bordeaux"];
const PROVIDER_TIMEOUT_MS=25_000;

type TryOnAction="default"|"full-length"|"multi-angle"|"recolor"|"variant";
type ViewAngle="front"|"three-quarter"|"back";

function tierDirection(tier:string){if(tier==="signature")return "premium fashion direction, refined fabrics, elevated tailoring, sophisticated accessories";if(tier==="smart")return "accessible fashion direction, versatile pieces, strong value for money, clean styling";return "balanced contemporary fashion direction, polished but attainable, strong style-to-price balance"}
function selectedSilhouette(tier:string,garments:string[]){const pool=garments.length?garments:OPEN_WARDROBE;const offset=tier==="signature"?0:tier==="balance"?1:2;return pool[offset%pool.length]}
function fileToBase64(file:File){return file.arrayBuffer().then(buffer=>Buffer.from(buffer).toString("base64"))}
function findImageData(value:unknown):{data:string;mime:string}|null{if(!value||typeof value!=="object")return null;const obj=value as Record<string,unknown>;const data=typeof obj.data==="string"?obj.data:"";const mime=typeof obj.mime_type==="string"?obj.mime_type:typeof obj.mimeType==="string"?obj.mimeType:"";if(data&&mime.startsWith("image/"))return {data,mime};for(const child of Object.values(obj)){if(Array.isArray(child)){for(const item of child){const found=findImageData(item);if(found)return found}}else if(child&&typeof child==="object"){const found=findImageData(child);if(found)return found}}return null}
async function fetchTimed(url:string,init:RequestInit,timeout=PROVIDER_TIMEOUT_MS){const controller=new AbortController();const id=setTimeout(()=>controller.abort(),timeout);try{return await fetch(url,{...init,signal:controller.signal})}finally{clearTimeout(id)}}
function asObject(value:unknown){return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{} as Record<string,unknown>}
function text(value:unknown,max=320){return String(value||"").replace(/\s+/g," ").trim().slice(0,max)}
function objectList(obj:Record<string,unknown>,key:string){return Array.isArray(obj[key])?(obj[key] as unknown[]).map(v=>text(v,80)).filter(Boolean):[]}
function unique(values:string[]){return Array.from(new Set(values.map(v=>v.trim()).filter(Boolean)))}
function normalized(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()}
function colorAvoided(color:string,avoided:string[]){const target=normalized(color);return avoided.some(value=>{const item=normalized(value);return item===target||item.includes(target)||target.includes(item)})}

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
function weddingGarments(role:string,preference:string){
 if(preference==="dress")return ["dress"];
 if(preference==="tailored")return ["tailored suit","matching set","shirt-and-skirt look"];
 if(preference==="jumpsuit")return ["jumpsuit"];
 if(role==="bride")return ["dress","tailored suit","jumpsuit"];
 return ["dress","jumpsuit","tailored suit"];
}
function weddingRoleDirection(role:string,whiteAllowed:boolean){
 if(role==="bride")return "The customer is the bride. Bridal white, ivory and modern coloured bridal alternatives are allowed. Follow her explicit palette before any conventional bridal default. Create sophisticated bridal fashion, never costume styling, and keep the outfit credible for the stated venue and dress code.";
 if(role==="maid")return `The customer is a maid of honour or bridesmaid. Coordinate with the stated wedding palette and dress code, while keeping her clearly distinct from the bride.${whiteAllowed?" White or ivory is allowed only because the brief explicitly requests it.":" Do not use bridal white, ivory, bridal veils or bride-like styling."}`;
 if(role==="mother")return `The customer is the mother of the bride or groom. Make the result elegant, modern, celebratory and refined without making it matronly.${whiteAllowed?" White or ivory is allowed only because the brief explicitly requests it.":" Do not make her look like the bride and avoid bridal white or ivory."}`;
 return `The customer is a wedding guest. Make the look occasion-appropriate, polished and comfortable enough for a real wedding.${whiteAllowed?" White or ivory is allowed only because the brief explicitly requests it.":" Do not use bridal white, ivory, bridal veils or any styling that could be mistaken for the bride."}`;
}
function angleDirection(angle:ViewAngle){
 if(angle==="back")return "Camera angle: true full-length back view. Show the complete back construction of the exact same outfit, from hairstyle to heels. Do not redesign the garment for the back.";
 if(angle==="three-quarter")return "Camera angle: full-length three-quarter view at roughly 45 degrees. Keep the entire head, outfit and both shoes inside the frame.";
 return "Camera angle: straight-on full-length front view, neutral natural stance, whole person visible from top of hair to shoe soles.";
}
function actionDirection(action:TryOnAction,hasLookReference:boolean){
 if(action==="full-length")return hasLookReference?"Reframe the existing outfit reference as a strict full-length head-to-toe fashion image. Preserve the garment design and styling; correct only composition/camera distance where needed.":"Prioritize a strict full-length composition.";
 if(action==="multi-angle")return "This is one view in a multi-angle set. Preserve the exact outfit design, color, fabric appearance, shoes, accessories and hairstyle from the existing outfit reference.";
 if(action==="recolor")return "Preserve the existing outfit design, cut, fabric character, accessories and shoes. Change the main garment color only as instructed, unless a small accessory adjustment is necessary for harmony.";
 if(action==="variant")return "Create a new variant within the same Look&Go tier and wedding brief. It may change cut, neckline, sleeves, length or details, while keeping the same role, budget positioning and requested color rules.";
 return "Create the requested Look&Go direction.";
}

async function generateWithGoogle(prompt:string,portrait:File,fullBody:File,lookReference?:File|null){
 const key=process.env.GOOGLE_AI_API_KEY;if(!key)throw new Error("GOOGLE_NOT_CONFIGURED");
 const files=[portrait,fullBody,...(lookReference?[lookReference]:[])];
 const encoded=await Promise.all(files.map(async file=>({type:"image",mime_type:file.type||"image/jpeg",data:await fileToBase64(file)})));
 const model=process.env.GOOGLE_IMAGE_MODEL||"gemini-3.1-flash-image";
 const response=await fetchTimed("https://generativelanguage.googleapis.com/v1beta/interactions",{method:"POST",headers:{"x-goog-api-key":key,"Content-Type":"application/json"},body:JSON.stringify({model,input:[{type:"text",text:prompt},...encoded],response_format:{type:"image",aspect_ratio:"2:3",image_size:"1K"}})});
 const data=await response.json().catch(()=>({}));if(!response.ok){console.error("Google Try-On failed",response.status,JSON.stringify(data).slice(0,1000));if(response.status===429)throw new Error("GOOGLE_QUOTA");if(response.status===401||response.status===403)throw new Error("GOOGLE_AUTH");throw new Error(`GOOGLE_HTTP_${response.status}`)}const image=findImageData(data);if(!image)throw new Error("GOOGLE_NO_IMAGE");return {image:`data:${image.mime};base64,${image.data}`,model,provider:"google"}
}

async function generateWithOpenAI(prompt:string,portrait:File,fullBody:File,lookReference?:File|null){
 const key=process.env.OPENAI_API_KEY;if(!key)throw new Error("OPENAI_NOT_CONFIGURED");const model=process.env.OPENAI_IMAGE_MODEL||"gpt-image-2";const body=new FormData();body.append("model",model);body.append("prompt",prompt);body.append("size","1024x1536");body.append("quality",process.env.OPENAI_IMAGE_QUALITY||"medium");body.append("image[]",portrait,portrait.name||"portrait.jpg");body.append("image[]",fullBody,fullBody.name||"full-body.jpg");if(lookReference)body.append("image[]",lookReference,lookReference.name||"look-reference.png");
 const response=await fetchTimed("https://api.openai.com/v1/images/edits",{method:"POST",headers:{Authorization:`Bearer ${key}`},body});const data=await response.json().catch(()=>({}));if(!response.ok){console.error("OpenAI Try-On failed",response.status,JSON.stringify(data).slice(0,1000));if(response.status===429)throw new Error("OPENAI_QUOTA");if(response.status===401||response.status===403)throw new Error("OPENAI_AUTH");throw new Error(`OPENAI_HTTP_${response.status}`)}const item=data?.data?.[0];if(item?.b64_json)return {image:`data:image/png;base64,${item.b64_json}`,model,provider:"openai"};if(item?.url)return {image:item.url,model,provider:"openai"};throw new Error("OPENAI_NO_IMAGE")
}

export async function POST(request:Request){
 const requestStarted=Date.now();
 try{
  const incoming=await request.formData();
  const portrait=incoming.get("portrait");const fullBody=incoming.get("fullBody");const lookReferenceValue=incoming.get("lookReference");
  const tier=String(incoming.get("tier")||"").toLowerCase();const profile=String(incoming.get("profile")||"{}");
  const actionRaw=String(incoming.get("action")||"default").toLowerCase();const angleRaw=String(incoming.get("angle")||"front").toLowerCase();
  const action=(ACTIONS.has(actionRaw)?actionRaw:"default") as TryOnAction;const angle=(ANGLES.has(angleRaw)?angleRaw:"front") as ViewAngle;
  const requestedColor=text(incoming.get("targetColor"),80);
  const lookReference=lookReferenceValue instanceof File&&lookReferenceValue.type.startsWith("image/")?lookReferenceValue:null;
  if(!(portrait instanceof File)||!(fullBody instanceof File))return NextResponse.json({error:"Le portrait et la photo plein pied sont obligatoires."},{status:400});
  if(!TIERS.has(tier))return NextResponse.json({error:"Niveau de look invalide."},{status:400});
  if(!portrait.type.startsWith("image/")||!fullBody.type.startsWith("image/"))return NextResponse.json({error:"Les deux fichiers doivent être des images."},{status:400});
  if(portrait.size>10_000_000||fullBody.size>10_000_000||(lookReference&&lookReference.size>10_000_000))return NextResponse.json({error:"Chaque photo doit faire moins de 10 Mo."},{status:400});

  let parsed:Record<string,unknown>={};try{parsed=JSON.parse(profile)}catch{}
  const list=(key:string)=>Array.isArray(parsed[key])?(parsed[key] as unknown[]).map(v=>text(v,80)).filter(Boolean):[];
  const styles=list("styles"),colors=list("likedColors"),avoided=list("avoidColors"),garments=list("garmentTypes"),occasions=list("occasions");
  const weddingEvent=asObject(parsed.wedding);const weddingEnabled=Boolean(weddingEvent.enabled);const weddingRole=text(weddingEvent.role||"guest",30);const outfitPreference=text(weddingEvent.outfitPreference||"auto",30);
  const eventColors=objectList(weddingEvent,"requiredColors"),eventAvoid=objectList(weddingEvent,"avoidColors");const effectiveColors=eventColors.length?eventColors:colors;const effectiveAvoid=unique([...avoided,...eventAvoid]);
  const legacyWedding=occasions.some(x=>x.toLowerCase().includes("mariée")||x.toLowerCase().includes("mariage"));const wedding=weddingEnabled||legacyWedding;
  const garmentPool=weddingEnabled?weddingGarments(weddingRole,outfitPreference):garments;const silhouette=selectedSilhouette(tier,garmentPool);
  const trendPreference=String(parsed.trendPreference||"personalized");const trendBoldness=Math.max(0,Math.min(100,Number(parsed.trendBoldness??50)));
  const explicitWhite=eventColors.some(c=>/(^|\s)(white|blanc|ivoire|ivory|cream|crème)(\s|$)/i.test(c));
  const eventBudget=weddingEnabled?Number(weddingEvent.budget||parsed.budget||0):Number(parsed.budget||0);
  const tierIndex=tier==="signature"?0:tier==="balance"?1:2;
  const automaticWeddingPool=unique([...effectiveColors,...WEDDING_FALLBACK_COLORS]).filter(color=>!colorAvoided(color,effectiveAvoid));
  const fallbackTarget=wedding&&automaticWeddingPool.length?automaticWeddingPool[tierIndex%automaticWeddingPool.length]:"";
  const targetColor=requestedColor&&!colorAvoided(requestedColor,effectiveAvoid)?requestedColor:fallbackTarget;
  const champagneExplicit=effectiveColors.some(c=>normalized(c).includes("champagne"));

  const weddingContext=weddingEnabled?[
   `Wedding Concierge brief: role ${weddingRole}; event date ${text(weddingEvent.date,40)||"not specified"}; location ${text(weddingEvent.location,120)||"not specified"}; venue ${text(weddingEvent.venue,40)||"not specified"}; time ${text(weddingEvent.time,40)||"not specified"}; dress code ${text(weddingEvent.dressCode,120)||"not specified"}.`,
   eventColors.length?`Wedding palette explicitly requested by the customer: ${eventColors.join(", ")}. These requested colors have priority over generic wedding conventions.`:"No mandatory wedding palette was specified; use her general color preferences before generic wedding neutrals.",
   eventAvoid.length?`Wedding-specific colors strictly forbidden: ${eventAvoid.join(", ")}.`:"No extra wedding-specific avoided colors were specified.",
   targetColor?`For THIS ${tier} look the main garment color must be ${targetColor}. Treat this as a hard styling instruction.`:"",
   !champagneExplicit?"Champagne is NOT requested. Do not default to champagne, beige or washed-out ivory when a richer allowed color is available.":"Champagne may be used because the customer explicitly included it, but it is not mandatory for every direction.",
   weddingRoleDirection(weddingRole,explicitWhite),
   text(weddingEvent.notes,300)?`Practical event note from the customer: ${text(weddingEvent.notes,300)}.`:"",
   "Respect the stated location, venue and time context without inventing weather. The result must feel suitable for attending a real wedding and remain physically wearable.",
  ].filter(Boolean).join(" "):legacyWedding?"Wedding styling is explicitly enabled by the customer's occasion selection. If bridal, a bridal gown or modern bridal alternative is allowed; otherwise create an appropriate wedding-attendee look. Do not assume bridal styling unless selected.":"Do not introduce bridal styling unless the customer explicitly selects it.";

  const composition=wedding?[
   "MANDATORY COMPOSITION: vertical 2:3 full-length editorial portrait.",
   "Show the entire person from the very top of the hairstyle to the complete shoes and soles/heels in a single frame.",
   "Do not crop the hair, forehead, chin, dress hem, ankles, feet or shoes.",
   "Leave comfortable visible margin above the hair and below the shoes. The person should occupy roughly 78-84% of the image height, never edge-to-edge.",
   "Keep the subject centered with realistic floor contact and enough background around the silhouette to judge the complete outfit.",
  ].join(" "):"Keep anatomy realistic, hands natural, and show the whole body from head to shoes.";

  const referenceDirection=lookReference?"Image 3 is the existing generated outfit reference. Use it as the garment-design anchor. Preserve its exact recognizable outfit details whenever the requested action is full-length, multi-angle or recolor.":"";
  const prompt=[
   "Create a photorealistic virtual try-on fashion visualization of the exact same adult person shown in the supplied reference images.",
   "Image 1 is the portrait identity anchor. Image 2 is the full-body morphology and proportion anchor.",
   referenceDirection,
   "Preserve facial identity, skin tone, hairstyle, apparent age, body proportions, height impression and morphology exactly. Do not beautify, slim, enlarge, reshape, de-age or replace the person.",
   composition,
   wedding?angleDirection(angle):"",
   actionDirection(action,Boolean(lookReference)),
   `Customer age: ${String(parsed.age||"unknown")}. Do not stereotype by age; use it only to avoid obviously mismatched styling when combined with the customer's explicit preferences.`,
   `Fashion preference: ${trendPreference}. Boldness: ${trendBoldness}/100. ${trendDirection(trendPreference,trendBoldness)}`,
   `Fashion trend context: ${fashionTrendContext()}`,
   `Create a ${tierDirection(tier)}. Preferred styles: ${styles.join(", ")||"open contemporary fashion"}. Preferred colors: ${effectiveColors.join(", ")||"harmonious colors"}. Strictly avoid: ${effectiveAvoid.join(", ")||"none"}.`,
   targetColor?`MAIN COLOR LOCK: render the principal garment in ${targetColor}. Do not substitute champagne, beige, ivory or another neutral unless ${targetColor} itself is such a tone.`:"",
   `For this generation, use a ${silhouette} as the main garment silhouette. Do not default to trousers when another selected silhouette is requested.`,
   garmentPool.length?`The customer wants to explore these garment categories for this context: ${garmentPool.join(", ")}. Vary the three Look&Go tiers across these options when possible.`:"The customer left garment type open. Explore the full wardrobe and vary silhouettes rather than repeatedly defaulting to trousers.",
   occasions.length?`Intended occasions/univers: ${occasions.join(", ")}.`:"No additional occasion restriction.",
   weddingContext,
   `Usual sizes if useful for visual proportion: top ${String(parsed.topSize||"unknown")}, bottom ${String(parsed.bottomSize||"unknown")}, shoes ${String(parsed.shoeSize||"unknown")}.`,
   `Budget guidance: ${eventBudget||String(parsed.budget||"unknown")} EUR, priority ${String(parsed.budgetMode||tier)}. Keep the visual direction coherent with that positioning without claiming exact retail prices.`,
   "This is a style visualization, not a claim that any specific garment is an exact purchasable product. Neutral premium studio background, natural editorial lighting, realistic fabric drape.",
  ].filter(Boolean).join(" ");

  const providers=activeProviders("image");if(!providers.length)return NextResponse.json({error:"Aucun moteur d’image actif n’est configuré."},{status:503});
  const errors:string[]=[];
  for(const provider of providers){
   const started=Date.now();
   try{
    let result:{image:string;model:string;provider:string}|null=null;
    if(provider.id==="google")result=await generateWithGoogle(prompt,portrait,fullBody,lookReference);else if(provider.id==="openai")result=await generateWithOpenAI(prompt,portrait,fullBody,lookReference);else continue;
    if(result){const meta=buildAiCostMeta(result.provider,result.model,"image",Date.now()-started);console.info("TRYON_SUCCESS",JSON.stringify({tier,silhouette,trendPreference,trendBoldness,wedding,weddingRole:wedding?weddingRole:null,action,angle,targetColor:targetColor||null,hasLookReference:Boolean(lookReference),...meta,totalDurationMs:Date.now()-requestStarted}));return NextResponse.json({...result,tier,silhouette,trendPreference,trendBoldness,wedding,weddingRole:wedding?weddingRole:null,action,angle,targetColor:targetColor||null,meta})}
   }catch(error){const code=error instanceof Error?(error.name==="AbortError"?`${provider.id.toUpperCase()}_TIMEOUT`:error.message):"PROVIDER_ERROR";errors.push(`${provider.id}:${code}`);console.error("Try-On provider failed",provider.id,code,Date.now()-started)}
  }
  console.error("All active Try-On providers failed",errors.join(","));const quotaOnly=errors.length>0&&errors.every(x=>x.includes("QUOTA"));return NextResponse.json({error:quotaOnly?"Les crédits du moteur IA sont temporairement épuisés. Réessayez plus tard ou activez un autre fournisseur.":"La génération est temporairement indisponible. Réessayez dans quelques instants.",codes:process.env.NODE_ENV==="development"?errors:undefined},{status:quotaOnly?429:502});
 }catch(error){console.error("Try-On route error",error);return NextResponse.json({error:"Erreur serveur pendant la génération IA."},{status:500})}
}
