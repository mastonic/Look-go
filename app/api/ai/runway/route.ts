import { NextResponse } from "next/server";
import { buildAiCostMeta } from "@/lib/ai/costs";

export const runtime="nodejs";
export const maxDuration=60;
const TIERS=new Set(["signature","balance","smart"]);
const TIMEOUT_MS=25_000;
const GOOGLE_BASE="https://generativelanguage.googleapis.com/v1beta";
const GOOGLE_SAFE_MODEL="veo-3.1-generate-preview";

function runwayPrompt(tier:string){
 const label=tier==="signature"?"Signature":tier==="smart"?"Smart":"Équilibre";
 return [
  `Create an ultra-realistic 8-second vertical fashion runway video for the ${label} Look&Go look. Use the supplied image as the exact identity, body, outfit and first-frame reference.`,
  "ABSOLUTE CONTINUITY: preserve the exact same adult person's face, facial proportions, skin tone, hairstyle, apparent age, body shape, height impression, limbs, hands and outfit from the reference. Do not beautify, slim, enlarge, reshape, de-age, replace or morph the person. Do not redesign, recolor, shorten, lengthen or swap any garment, shoe or accessory.",
  "TIMELINE 0.0-3.0 seconds: the person starts naturally from the reference pose and walks straight toward the camera with 2 to 4 realistic runway steps. Natural heel-to-toe footfalls, normal arm swing, subtle breathing, believable balance and restrained fabric movement. Move closer only moderately so the full body remains visible.",
  "TIMELINE 3.0-6.0 seconds: the person slows, plants the feet naturally and performs one smooth complete 360-degree turn on the spot, at realistic human speed. Show front, side, back, opposite side and return toward front. Clothing and hair must react with believable inertia and settle naturally. No spinning like a mannequin and no impossible foot sliding.",
  "TIMELINE 6.0-8.0 seconds: creative freedom within a premium fashion editorial style. Prefer one realistic finishing action such as a small final step, a subtle three-quarter pose, a natural glance, or a gentle adjustment of posture. Keep it elegant, restrained and physically plausible.",
  "CAMERA: vertical 9:16, stable eye-level or slightly low fashion camera, minimal natural dolly only if needed to preserve full-body framing. Keep head, hands and both shoes visible throughout. No zoom jumps, no orbit around the person, no cuts, no teleportation, no camera shake and no lens warping.",
  "REALISM: realistic human gait, anatomy, joints, hands, feet, weight transfer, cloth physics, shadows and floor contact. Avoid floating feet, skating, duplicated limbs, rubber limbs, face drift, body flicker, outfit flicker, background melting or sudden pose changes.",
  "LIGHTING AND SET: premium clean fashion-studio environment with stable editorial lighting and consistent shadows. Preserve the reference background when possible rather than inventing a distracting scene.",
  "No dialogue, no captions, no logos added, no text overlays. Prioritize identity continuity, body continuity, outfit continuity and believable physical motion over dramatic cinematic effects."
 ].join(" ");
}
function normalizeReference(image:File){if(!["image/jpeg","image/png","image/webp"].includes(image.type))throw new Error("FORMAT_IMAGE");return image}
async function timedFetch(url:string,init:RequestInit,timeout=TIMEOUT_MS){const c=new AbortController();const timer=setTimeout(()=>c.abort(),timeout);try{return await fetch(url,{...init,signal:c.signal})}finally{clearTimeout(timer)}}
function googleId(name:string){return `google_${Buffer.from(name).toString("base64url")}`}
function googleOperation(id:string){if(!id.startsWith("google_"))return "";try{return Buffer.from(id.slice(7),"base64url").toString("utf8")}catch{return ""}}
function providerEnabled(id:"google"|"openai"){return process.env[`AI_${id.toUpperCase()}_ENABLED`]!=="false"}
function googleModels(){const configured=String(process.env.GOOGLE_VIDEO_MODEL||"").trim();return Array.from(new Set([configured,GOOGLE_SAFE_MODEL].filter(Boolean)));}
function googlePayload(prompt:string,image:File,data:string,mode:"start-frame"|"reference"){
 const instance=mode==="start-frame"
  ? {prompt,image:{inlineData:{mimeType:image.type,data}}}
  : {prompt,referenceImages:[{image:{inlineData:{mimeType:image.type,data}},referenceType:"asset"}]};
 return {instances:[instance],parameters:{aspectRatio:"9:16",durationSeconds:"8",resolution:"720p",personGeneration:"allow_adult",numberOfVideos:1}};
}
function googleRetryable(status:number,message:string){return status===400||status===404||/inlineData|not supported|invalid argument|model/i.test(message);}

async function createGoogle(image:File,tier:string){
 const key=process.env.GOOGLE_AI_API_KEY;if(!key||!providerEnabled("google"))throw new Error("GOOGLE_NOT_CONFIGURED");
 const data=Buffer.from(await image.arrayBuffer()).toString("base64");
 const prompt=runwayPrompt(tier);
 const failures:string[]=[];
 for(const model of googleModels()){
  for(const mode of ["start-frame","reference"] as const){
   const response=await timedFetch(`${GOOGLE_BASE}/models/${encodeURIComponent(model)}:predictLongRunning`,{method:"POST",headers:{"x-goog-api-key":key,"content-type":"application/json"},body:JSON.stringify(googlePayload(prompt,image,data,mode))});
   const body=await response.json().catch(()=>({}));
   if(response.ok){const name=String(body?.name||"");if(!name)throw new Error("GOOGLE_NO_OPERATION");console.info("GOOGLE_VEO_CREATE_SUCCESS",JSON.stringify({model,mode,tier}));return {id:googleId(name),status:"queued",progress:0,provider:"google",model};}
   const providerMessage=String(body?.error?.message||"");
   console.error("Google Veo create failed",response.status,JSON.stringify({model,mode,message:providerMessage}).slice(0,1200));
   if(response.status===429)throw new Error("GOOGLE_QUOTA");
   if(response.status===401||response.status===403)throw new Error("GOOGLE_AUTH");
   failures.push(`${model}:${mode}:${response.status}`);
   if(!googleRetryable(response.status,providerMessage))throw new Error(`GOOGLE_HTTP_${response.status}`);
  }
 }
 console.error("GOOGLE_VEO_ALL_ATTEMPTS_FAILED",JSON.stringify({tier,failures}));
 throw new Error("GOOGLE_MODEL_INPUT");
}

async function createOpenAI(image:File,tier:string){
 const key=process.env.OPENAI_API_KEY;if(!key||!providerEnabled("openai"))throw new Error("OPENAI_NOT_CONFIGURED");
 const model=process.env.OPENAI_VIDEO_MODEL||"sora-2";const body=new FormData();body.append("model",model);body.append("prompt",runwayPrompt(tier));body.append("seconds","8");body.append("size","720x1280");body.append("input_reference",image,image.name||`${tier}-runway.jpg`);
 const response=await timedFetch("https://api.openai.com/v1/videos",{method:"POST",headers:{Authorization:`Bearer ${key}`},body});const data=await response.json().catch(()=>({}));
 if(!response.ok){const providerMessage=String(data?.error?.message||"");console.error("OpenAI video create failed",response.status,providerMessage||data);if(response.status===429)throw new Error("OPENAI_QUOTA");if(response.status===401||response.status===403)throw new Error("OPENAI_AUTH");throw new Error(`OPENAI_HTTP_${response.status}`)}
 if(!data?.id)throw new Error("OPENAI_NO_OPERATION");return {id:String(data.id),status:String(data.status||"queued"),progress:Number(data.progress||0),provider:"openai",model};
}

export async function POST(request:Request){
 const started=Date.now();
 try{
  const incoming=await request.formData();const rawImage=incoming.get("image");const tier=String(incoming.get("tier")||"").toLowerCase();if(!(rawImage instanceof File))return NextResponse.json({error:"Le look Try-On validé est obligatoire."},{status:400});if(!TIERS.has(tier))return NextResponse.json({error:"Niveau de look invalide."},{status:400});if(rawImage.size>15_000_000)return NextResponse.json({error:"L'image Try-On doit faire moins de 15 Mo."},{status:400});const image=normalizeReference(rawImage);
  const attempts=[createOpenAI,createGoogle];const errors:string[]=[];
  for(const create of attempts){const providerStarted=Date.now();try{const result=await create(image,tier);const meta=buildAiCostMeta(result.provider,result.model,"video",Date.now()-providerStarted);console.info("RUNWAY_CREATE_SUCCESS",JSON.stringify({tier,id:result.id,...meta,totalDurationMs:Date.now()-started}));return NextResponse.json({...result,tier,meta})}catch(error){const code=error instanceof Error?(error.name==="AbortError"?"PROVIDER_TIMEOUT":error.message):"PROVIDER_ERROR";errors.push(code);console.error("RUNWAY_PROVIDER_FAILED",JSON.stringify({tier,code}));}}
  const configuredErrors=errors.filter(code=>!code.endsWith("NOT_CONFIGURED"));
  const quotaOnly=configuredErrors.length>0&&configuredErrors.every(x=>x.includes("QUOTA"));
  const noneConfigured=errors.length>0&&errors.every(x=>x.endsWith("NOT_CONFIGURED"));
  return NextResponse.json({error:quotaOnly?"Les crédits vidéo sont temporairement épuisés.":noneConfigured?"Aucun moteur vidéo n’est activé dans Look&Go. Ouvrez Admin IA pour configurer Google ou OpenAI.":"Aucun moteur vidéo disponible n’a pu lancer le défilé."},{status:quotaOnly?429:503});
 }catch(error){if(error instanceof Error&&error.name==="AbortError")return NextResponse.json({error:"Le moteur vidéo met trop de temps à répondre. Réessayez."},{status:504});console.error("Runway create route error",error);return NextResponse.json({error:"Erreur serveur pendant la création du défilé."},{status:500})}
}

export async function GET(request:Request){
 const id=new URL(request.url).searchParams.get("id")||"";
 const operation=googleOperation(id);
 if(operation){const key=process.env.GOOGLE_AI_API_KEY;if(!key)return NextResponse.json({error:"Le moteur vidéo Google n'est pas configuré."},{status:503});try{const response=await timedFetch(`${GOOGLE_BASE}/${operation}`,{headers:{"x-goog-api-key":key},cache:"no-store"});const data=await response.json().catch(()=>({}));if(!response.ok)return NextResponse.json({error:"Impossible de récupérer l'état du défilé Google."},{status:502});if(data?.error)return NextResponse.json({id,status:"failed",progress:100,error:String(data.error?.message||"La génération vidéo a échoué.")});return NextResponse.json({id,status:data?.done?"completed":"in_progress",progress:data?.done?100:Math.max(5,Number(data?.metadata?.progressPercent||data?.metadata?.progress||30)),error:null})}catch(error){if(error instanceof Error&&error.name==="AbortError")return NextResponse.json({error:"Le suivi vidéo Google met trop de temps à répondre."},{status:504});return NextResponse.json({error:"Erreur pendant le suivi du défilé Google."},{status:500})}}
 if(!/^video_[A-Za-z0-9_-]+$/.test(id))return NextResponse.json({error:"Identifiant vidéo invalide."},{status:400});const key=process.env.OPENAI_API_KEY;if(!key)return NextResponse.json({error:"Le moteur vidéo OpenAI n'est pas configuré."},{status:503});try{const response=await timedFetch(`https://api.openai.com/v1/videos/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${key}`},cache:"no-store"});const data=await response.json().catch(()=>({}));if(!response.ok)return NextResponse.json({error:"Impossible de récupérer l'état du défilé."},{status:502});return NextResponse.json({id:data.id,status:data.status,progress:data.progress??0,error:data.error?.message||null})}catch(error){if(error instanceof Error&&error.name==="AbortError")return NextResponse.json({error:"Le suivi vidéo met trop de temps à répondre."},{status:504});console.error("Runway status route error",error);return NextResponse.json({error:"Erreur pendant le suivi du défilé."},{status:500})}
}
