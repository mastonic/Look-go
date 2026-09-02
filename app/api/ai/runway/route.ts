import { NextResponse } from "next/server";
import { buildAiCostMeta } from "@/lib/ai/costs";

export const runtime="nodejs";
export const maxDuration=60;

const TIERS=new Set(["signature","balance","smart"]);
const TIMEOUT_MS=25_000;
const GOOGLE_BASE="https://generativelanguage.googleapis.com/v1beta";
const GOOGLE_SAFE_MODEL="veo-3.1-generate-preview";
const RUNWAY_PROMPT_VERSION="runway-motion-v3";
const RUNWAY_DURATION_SECONDS=8;

function runwayPrompt(tier:string){
 const label=tier==="signature"?"Signature":tier==="smart"?"Smart":"Équilibre";
 return [
  `Animate the supplied Look&Go ${label} Try-On into real-looking live-action fashion runway footage lasting exactly ${RUNWAY_DURATION_SECONDS} seconds.`,
  "BODY MOTION IS MANDATORY. THIS MUST NOT LOOK LIKE AN ANIMATED STILL PHOTO. The reference defines the person's appearance and outfit, NOT a locked pose. The person's pose, leg positions, arm positions and body position MUST visibly change throughout the clip.",
  "Use the supplied Try-On as the visual identity and wardrobe reference. Preserve the same recognizable adult person: same facial identity, face shape, eyes, nose, mouth, skin tone, hairstyle, apparent age and body proportions. Preserve the same garments, colors, cut, shoes and accessories. Identity preservation does NOT mean freezing the subject.",
  "0.0-3.0 SECONDS — REAL WALK: the PERSON physically walks straight toward the camera with 2 to 4 clearly visible natural runway steps. Legs alternate. Knees and hips articulate. Each foot lifts, travels forward and visibly contacts the floor again. Weight transfers from one leg to the other. Arms swing subtly. The person's body genuinely translates forward in the scene and becomes moderately closer because they walked, never because of a camera zoom.",
  "The floor contact must prove the walk: shoes change position relative to the floor on every step. NO frozen legs, NO skating, NO sliding feet, NO digital scale-up, NO dolly-in pretending to be a walk. If any instruction conflicts, prioritize a clear physical human walk.",
  "3.0-6.0 SECONDS — REAL 360 TURN: after the walk, the PERSON slows and performs one deliberate complete 360-degree turn on the spot. The PERSON rotates, NOT the camera. Feet pivot and step naturally, hips rotate, shoulders follow, weight shifts, clothing and hair react with believable inertia. Show front, side, back, opposite side and return to face the camera.",
  "6.0-8.0 SECONDS — MODEL FINISH: finish with a simple premium runway pose, a small final step or subtle three-quarter stance. Keep the finish restrained and physically realistic. Do not introduce a new scene or dramatic effect.",
  "CAMERA: mostly stationary vertical 9:16 fashion camera. Keep the full body visible from head to shoes whenever possible. Do not use zoom to replace subject movement. Do not orbit around a stationary subject. No sudden cuts, teleportation, whip pans or artificial parallax tricks.",
  "PHYSICAL REALISM: natural human gait, balance, joints, elbows, knees, hands, feet, floor contact, body weight transfer, fabric physics and hair motion. Avoid floating, skating, duplicated limbs, rubber limbs, face drift, body flicker, outfit flicker, background melting or pose snapping.",
  "STRICTLY AVOID: static person, frozen lower body, animated photograph effect, only hair moving, only fabric moving, only facial blinking, camera zoom replacing walking, camera orbit replacing the person's rotation, morphing, identity changes, outfit changes, beautification or de-aging.",
  "BODY MOTION IS MANDATORY. The original person must remain recognizable WHILE physically walking and turning. If a perfect 360 turn cannot be achieved, prioritize clearly visible real walking and a genuine body turn over cinematic effects.",
  "No dialogue, captions or added text. Produce natural premium runway footage, not a motion poster."
 ].join(" ");
}

function normalizeReference(image:File){
 if(!["image/jpeg","image/png","image/webp"].includes(image.type))throw new Error("FORMAT_IMAGE");
 return image;
}

async function timedFetch(url:string,init:RequestInit,timeout=TIMEOUT_MS){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeout);
 try{return await fetch(url,{...init,signal:controller.signal})}
 finally{clearTimeout(timer)}
}

function googleId(name:string){return `google_${Buffer.from(name).toString("base64url")}`}
function googleOperation(id:string){
 if(!id.startsWith("google_"))return "";
 try{return Buffer.from(id.slice(7),"base64url").toString("utf8")}
 catch{return ""}
}
function providerEnabled(id:"google"|"openai"){return process.env[`AI_${id.toUpperCase()}_ENABLED`]!=="false"}
function googleModels(){
 const configured=String(process.env.GOOGLE_VIDEO_MODEL||"").trim();
 return Array.from(new Set([configured,GOOGLE_SAFE_MODEL].filter(Boolean)));
}
function googlePayload(prompt:string,image:File,data:string,mode:"start-frame"|"reference"){
 const instance=mode==="start-frame"
  ? {prompt,image:{inlineData:{mimeType:image.type,data}}}
  : {prompt,referenceImages:[{image:{inlineData:{mimeType:image.type,data}},referenceType:"asset"}]};
 return {instances:[instance],parameters:{aspectRatio:"9:16",durationSeconds:String(RUNWAY_DURATION_SECONDS),resolution:"720p",personGeneration:"allow_adult",numberOfVideos:1}};
}
function googleRetryable(status:number,message:string){return status===400||status===404||/inlineData|not supported|invalid argument|model/i.test(message)}

async function createGoogle(image:File,tier:string){
 const key=process.env.GOOGLE_AI_API_KEY;
 if(!key||!providerEnabled("google"))throw new Error("GOOGLE_NOT_CONFIGURED");
 const data=Buffer.from(await image.arrayBuffer()).toString("base64");
 const prompt=runwayPrompt(tier);
 const failures:string[]=[];
 for(const model of googleModels()){
  for(const mode of ["start-frame","reference"] as const){
   console.info("RUNWAY_PROVIDER_SELECTED",JSON.stringify({provider:"google",model,tier,promptVersion:RUNWAY_PROMPT_VERSION,durationSeconds:RUNWAY_DURATION_SECONDS,mode}));
   const response=await timedFetch(`${GOOGLE_BASE}/models/${encodeURIComponent(model)}:predictLongRunning`,{
    method:"POST",
    headers:{"x-goog-api-key":key,"content-type":"application/json"},
    body:JSON.stringify(googlePayload(prompt,image,data,mode)),
   });
   const body=await response.json().catch(()=>({}));
   if(response.ok){
    const name=String(body?.name||"");
    if(!name)throw new Error("GOOGLE_NO_OPERATION");
    console.info("GOOGLE_VEO_CREATE_SUCCESS",JSON.stringify({model,mode,tier,promptVersion:RUNWAY_PROMPT_VERSION}));
    return {id:googleId(name),status:"queued",progress:0,provider:"google",model};
   }
   const providerMessage=String(body?.error?.message||"");
   console.error("Google Veo create failed",response.status,JSON.stringify({model,mode,message:providerMessage}).slice(0,1200));
   if(response.status===429)throw new Error("GOOGLE_QUOTA");
   if(response.status===401||response.status===403)throw new Error("GOOGLE_AUTH");
   failures.push(`${model}:${mode}:${response.status}`);
   if(!googleRetryable(response.status,providerMessage))throw new Error(`GOOGLE_HTTP_${response.status}`);
  }
 }
 console.error("GOOGLE_VEO_ALL_ATTEMPTS_FAILED",JSON.stringify({tier,failures,promptVersion:RUNWAY_PROMPT_VERSION}));
 throw new Error("GOOGLE_MODEL_INPUT");
}

async function createOpenAI(image:File,tier:string){
 const key=process.env.OPENAI_API_KEY;
 if(!key||!providerEnabled("openai"))throw new Error("OPENAI_NOT_CONFIGURED");
 const model=process.env.OPENAI_VIDEO_MODEL||"sora-2";
 console.info("RUNWAY_PROVIDER_SELECTED",JSON.stringify({provider:"openai",model,tier,promptVersion:RUNWAY_PROMPT_VERSION,durationSeconds:RUNWAY_DURATION_SECONDS}));
 const body=new FormData();
 body.append("model",model);
 body.append("prompt",runwayPrompt(tier));
 body.append("seconds",String(RUNWAY_DURATION_SECONDS));
 body.append("size","720x1280");
 body.append("input_reference",image,image.name||`${tier}-runway.jpg`);
 const response=await timedFetch("https://api.openai.com/v1/videos",{method:"POST",headers:{Authorization:`Bearer ${key}`},body});
 const data=await response.json().catch(()=>({}));
 if(!response.ok){
  const providerMessage=String(data?.error?.message||"");
  console.error("OpenAI video create failed",response.status,providerMessage||data);
  if(response.status===429)throw new Error("OPENAI_QUOTA");
  if(response.status===401||response.status===403)throw new Error("OPENAI_AUTH");
  throw new Error(`OPENAI_HTTP_${response.status}`);
 }
 if(!data?.id)throw new Error("OPENAI_NO_OPERATION");
 return {id:String(data.id),status:String(data.status||"queued"),progress:Number(data.progress||0),provider:"openai",model};
}

export async function POST(request:Request){
 const started=Date.now();
 try{
  const incoming=await request.formData();
  const rawImage=incoming.get("image");
  const rawPortrait=incoming.get("portrait");
  const tier=String(incoming.get("tier")||"").toLowerCase();
  if(!(rawImage instanceof File))return NextResponse.json({error:"Le look Try-On validé est obligatoire."},{status:400});
  if(!TIERS.has(tier))return NextResponse.json({error:"Niveau de look invalide."},{status:400});
  if(rawImage.size>15_000_000)return NextResponse.json({error:"L'image Try-On doit faire moins de 15 Mo."},{status:400});
  const image=normalizeReference(rawImage);
  const portraitAvailable=rawPortrait instanceof File&&rawPortrait.size>0;
  console.info("RUNWAY_REQUEST",JSON.stringify({tier,promptVersion:RUNWAY_PROMPT_VERSION,durationSeconds:RUNWAY_DURATION_SECONDS,imageBytes:image.size,portraitReferenceAvailable:portraitAvailable}));
  console.info("RUNWAY_PROMPT_VERSION",JSON.stringify({version:RUNWAY_PROMPT_VERSION,tier,durationSeconds:RUNWAY_DURATION_SECONDS}));

  // OpenAI currently accepts a single input_reference asset on this endpoint.
  // The Try-On remains the motion/body/outfit reference; portrait availability is logged
  // so the pipeline is ready for multi-reference support when the provider exposes it.
  const attempts=[createOpenAI,createGoogle];
  const errors:string[]=[];
  for(const create of attempts){
   const providerStarted=Date.now();
   try{
    const result=await create(image,tier);
    const meta=buildAiCostMeta(result.provider,result.model,"video",Date.now()-providerStarted);
    console.info("RUNWAY_CREATE_SUCCESS",JSON.stringify({tier,id:result.id,provider:result.provider,model:result.model,promptVersion:RUNWAY_PROMPT_VERSION,durationSeconds:RUNWAY_DURATION_SECONDS,...meta,totalDurationMs:Date.now()-started}));
    return NextResponse.json({...result,tier,promptVersion:RUNWAY_PROMPT_VERSION,durationSeconds:RUNWAY_DURATION_SECONDS,createdAt:new Date().toISOString(),meta});
   }catch(error){
    const code=error instanceof Error?(error.name==="AbortError"?"PROVIDER_TIMEOUT":error.message):"PROVIDER_ERROR";
    errors.push(code);
    console.error("RUNWAY_PROVIDER_FAILED",JSON.stringify({tier,code,promptVersion:RUNWAY_PROMPT_VERSION}));
   }
  }
  const configuredErrors=errors.filter(code=>!code.endsWith("NOT_CONFIGURED"));
  const quotaOnly=configuredErrors.length>0&&configuredErrors.every(code=>code.includes("QUOTA"));
  const noneConfigured=errors.length>0&&errors.every(code=>code.endsWith("NOT_CONFIGURED"));
  return NextResponse.json({error:quotaOnly?"Les crédits vidéo sont temporairement épuisés.":noneConfigured?"Aucun moteur vidéo n’est activé dans Look&Go. Ouvrez Admin IA pour configurer Google ou OpenAI.":"Aucun moteur vidéo disponible n’a pu lancer le défilé."},{status:quotaOnly?429:503});
 }catch(error){
  if(error instanceof Error&&error.name==="AbortError")return NextResponse.json({error:"Le moteur vidéo met trop de temps à répondre. Réessayez."},{status:504});
  console.error("Runway create route error",error);
  return NextResponse.json({error:"Erreur serveur pendant la création du défilé."},{status:500});
 }
}

export async function GET(request:Request){
 const id=new URL(request.url).searchParams.get("id")||"";
 const operation=googleOperation(id);
 if(operation){
  const key=process.env.GOOGLE_AI_API_KEY;
  if(!key)return NextResponse.json({error:"Le moteur vidéo Google n'est pas configuré."},{status:503});
  try{
   const response=await timedFetch(`${GOOGLE_BASE}/${operation}`,{headers:{"x-goog-api-key":key},cache:"no-store"});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)return NextResponse.json({error:"Impossible de récupérer l'état du défilé Google."},{status:502});
   if(data?.error)return NextResponse.json({id,status:"failed",progress:100,error:String(data.error?.message||"La génération vidéo a échoué."),provider:"google",promptVersion:RUNWAY_PROMPT_VERSION});
   const status=data?.done?"completed":"in_progress";
   if(status==="completed")console.info("RUNWAY_GENERATION_COMPLETED",JSON.stringify({id,provider:"google",promptVersion:RUNWAY_PROMPT_VERSION,durationSeconds:RUNWAY_DURATION_SECONDS}));
   return NextResponse.json({id,status,progress:data?.done?100:Math.max(5,Number(data?.metadata?.progressPercent||data?.metadata?.progress||30)),error:null,provider:"google",promptVersion:RUNWAY_PROMPT_VERSION,durationSeconds:RUNWAY_DURATION_SECONDS});
  }catch(error){
   if(error instanceof Error&&error.name==="AbortError")return NextResponse.json({error:"Le suivi vidéo Google met trop de temps à répondre."},{status:504});
   return NextResponse.json({error:"Erreur pendant le suivi du défilé Google."},{status:500});
  }
 }
 if(!/^video_[A-Za-z0-9_-]+$/.test(id))return NextResponse.json({error:"Identifiant vidéo invalide."},{status:400});
 const key=process.env.OPENAI_API_KEY;
 if(!key)return NextResponse.json({error:"Le moteur vidéo OpenAI n'est pas configuré."},{status:503});
 try{
  const response=await timedFetch(`https://api.openai.com/v1/videos/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${key}`},cache:"no-store"});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)return NextResponse.json({error:"Impossible de récupérer l'état du défilé."},{status:502});
  if(data.status==="completed")console.info("RUNWAY_GENERATION_COMPLETED",JSON.stringify({id:data.id,provider:"openai",model:data.model||process.env.OPENAI_VIDEO_MODEL||"sora-2",promptVersion:RUNWAY_PROMPT_VERSION,durationSeconds:Number(data.seconds||RUNWAY_DURATION_SECONDS)}));
  return NextResponse.json({id:data.id,status:data.status,progress:data.progress??0,error:data.error?.message||null,provider:"openai",model:data.model||process.env.OPENAI_VIDEO_MODEL||"sora-2",promptVersion:RUNWAY_PROMPT_VERSION,durationSeconds:Number(data.seconds||RUNWAY_DURATION_SECONDS)});
 }catch(error){
  if(error instanceof Error&&error.name==="AbortError")return NextResponse.json({error:"Le suivi vidéo met trop de temps à répondre."},{status:504});
  console.error("Runway status route error",error);
  return NextResponse.json({error:"Erreur pendant le suivi du défilé."},{status:500});
 }
}
