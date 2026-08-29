import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const TIERS = new Set(["signature", "balance", "smart"]);

function tierDirection(tier:string){
  if(tier==="signature") return "premium fashion direction, refined fabrics, elevated tailoring, sophisticated accessories";
  if(tier==="smart") return "accessible fashion direction, simple versatile pieces, strong value for money, clean styling";
  return "balanced contemporary fashion direction, polished but attainable, strong style-to-price balance";
}

export async function POST(request:Request){
  if(!process.env.OPENAI_API_KEY){
    return NextResponse.json({error:"Le moteur IA n'est pas encore configuré sur le serveur."},{status:503});
  }

  try{
    const incoming=await request.formData();
    const portrait=incoming.get("portrait");
    const fullBody=incoming.get("fullBody");
    const tier=String(incoming.get("tier")||"").toLowerCase();
    const profile=String(incoming.get("profile")||"{}");

    if(!(portrait instanceof File)||!(fullBody instanceof File)){
      return NextResponse.json({error:"Le portrait et la photo plein pied sont obligatoires."},{status:400});
    }
    if(!TIERS.has(tier)) return NextResponse.json({error:"Niveau de look invalide."},{status:400});
    if(portrait.size>10_000_000||fullBody.size>10_000_000) return NextResponse.json({error:"Chaque photo doit faire moins de 10 Mo."},{status:400});

    let parsed:Record<string,unknown>={};
    try{parsed=JSON.parse(profile)}catch{}
    const styles=Array.isArray(parsed.styles)?parsed.styles.join(", "):"contemporary";
    const colors=Array.isArray(parsed.likedColors)?parsed.likedColors.join(", "):"harmonious colors";
    const avoided=Array.isArray(parsed.avoidColors)?parsed.avoidColors.join(", "):"none";
    const prompt=[
      "Create a photorealistic full-body fashion visualization of the exact same adult person shown in the supplied reference images.",
      "Reference image 1 is the person's portrait and is the identity anchor. Reference image 2 is the full-body photo and is the body-proportion and morphology anchor.",
      "Preserve facial identity, skin tone, hairstyle, apparent age, body proportions, height impression and morphology. Do not beautify, slim, enlarge, reshape, de-age or replace the person.",
      "Keep anatomy realistic, hands natural, and show the whole body from head to shoes.",
      `Dress the person in a ${tierDirection(tier)}. Preferred styles: ${styles}. Preferred colors: ${colors}. Avoid colors: ${avoided}.`,
      `Usual sizes if useful for visual proportion: top ${String(parsed.topSize||"unknown")}, bottom ${String(parsed.bottomSize||"unknown")}, shoes ${String(parsed.shoeSize||"unknown")}.`,
      "This is a style visualization, not a claim that any specific garment is an exact purchasable product. Neutral premium studio background, natural editorial lighting, realistic fabric drape.",
    ].join(" ");

    const body=new FormData();
    body.append("model","gpt-image-2");
    body.append("prompt",prompt);
    body.append("size","1024x1536");
    body.append("quality","medium");
    body.append("image[]",portrait,portrait.name||"portrait.jpg");
    body.append("image[]",fullBody,fullBody.name||"full-body.jpg");

    const response=await fetch("https://api.openai.com/v1/images/edits",{
      method:"POST",
      headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},
      body,
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      const providerMessage=String(data?.error?.message||"");
      console.error("OpenAI image edit failed",response.status,providerMessage||data);
      return NextResponse.json({error:providerMessage?`Génération refusée par le moteur IA : ${providerMessage}`:"La génération IA a échoué. Réessayez dans quelques instants."},{status:502});
    }

    const item=data?.data?.[0];
    if(item?.b64_json) return NextResponse.json({image:`data:image/png;base64,${item.b64_json}`,tier,model:"gpt-image-2"});
    if(item?.url) return NextResponse.json({image:item.url,tier,model:"gpt-image-2"});
    return NextResponse.json({error:"Le moteur IA n'a retourné aucune image."},{status:502});
  }catch(error){
    console.error("Try-On route error",error);
    return NextResponse.json({error:"Erreur serveur pendant la génération IA."},{status:500});
  }
}
