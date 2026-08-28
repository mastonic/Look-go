import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const TIERS = new Set(["signature", "balance", "smart"]);

function runwayPrompt(tier:string){
  const label=tier==="signature"?"Signature":tier==="smart"?"Smart":"Équilibre";
  return [
    `Create a realistic vertical fashion runway clip for the ${label} Look&Go look using the supplied image as the exact visual reference and starting frame.`,
    "Preserve the same adult person's facial identity, skin tone, hairstyle, apparent age, body proportions, morphology and outfit exactly as shown in the reference image.",
    "Do not beautify, slim, enlarge, reshape, de-age or replace the person. Do not redesign, recolor or swap the clothing.",
    "Motion should be restrained and physically natural: a slow confident walk forward, subtle fabric movement, then a gentle 30 to 45 degree turn.",
    "Keep the full body visible from head to shoes. Stable premium editorial lighting, clean fashion-studio background, realistic anatomy, no camera warping, no sudden cuts.",
    "The clip is a fashion visualization. Prioritize identity and outfit continuity over dramatic motion."
  ].join(" ");
}

export async function POST(request:Request){
  if(!process.env.OPENAI_API_KEY){
    return NextResponse.json({error:"Le moteur vidéo n'est pas configuré sur le serveur."},{status:503});
  }

  try{
    const incoming=await request.formData();
    const image=incoming.get("image");
    const tier=String(incoming.get("tier")||"").toLowerCase();
    if(!(image instanceof File)) return NextResponse.json({error:"Le look Try-On validé est obligatoire."},{status:400});
    if(!TIERS.has(tier)) return NextResponse.json({error:"Niveau de look invalide."},{status:400});
    if(image.size>15_000_000) return NextResponse.json({error:"L'image Try-On doit faire moins de 15 Mo."},{status:400});

    const body=new FormData();
    body.append("model",process.env.OPENAI_VIDEO_MODEL||"sora-2");
    body.append("prompt",runwayPrompt(tier));
    body.append("seconds","8");
    body.append("size","720x1280");
    body.append("input_reference",image,image.name||`${tier}-tryon.png`);

    const response=await fetch("https://api.openai.com/v1/videos",{
      method:"POST",
      headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},
      body,
    });
    const data=await response.json();
    if(!response.ok){
      console.error("OpenAI video create failed",response.status,data?.error?.message||data);
      return NextResponse.json({error:"La création du défilé a échoué. Réessayez dans quelques instants."},{status:502});
    }
    return NextResponse.json({id:data.id,status:data.status,progress:data.progress??0,tier});
  }catch(error){
    console.error("Runway create route error",error);
    return NextResponse.json({error:"Erreur serveur pendant la création du défilé."},{status:500});
  }
}

export async function GET(request:Request){
  if(!process.env.OPENAI_API_KEY) return NextResponse.json({error:"Le moteur vidéo n'est pas configuré."},{status:503});
  const id=new URL(request.url).searchParams.get("id")||"";
  if(!/^video_[A-Za-z0-9_-]+$/.test(id)) return NextResponse.json({error:"Identifiant vidéo invalide."},{status:400});
  try{
    const response=await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(id)}`,{
      headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},
      cache:"no-store",
    });
    const data=await response.json();
    if(!response.ok) return NextResponse.json({error:"Impossible de récupérer l'état du défilé."},{status:502});
    return NextResponse.json({id:data.id,status:data.status,progress:data.progress??0,error:data.error?.message||null});
  }catch(error){
    console.error("Runway status route error",error);
    return NextResponse.json({error:"Erreur pendant le suivi du défilé."},{status:500});
  }
}
