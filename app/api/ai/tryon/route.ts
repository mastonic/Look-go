import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;
const TIERS=new Set(["signature","balance","smart"]);
const OPEN_WARDROBE=["trousers","jeans","skirt","dress","bodysuit","shorts","jumpsuit","matching set","tailored suit","shirt-and-skirt look","layered separates"];
function tierDirection(tier:string){if(tier==="signature")return"premium fashion direction, refined fabrics, elevated tailoring, sophisticated accessories";if(tier==="smart")return"accessible fashion direction, versatile pieces, strong value for money, clean styling";return"balanced contemporary fashion direction, polished but attainable, strong style-to-price balance";}
function selectedSilhouette(tier:string,garments:string[]){const pool=garments.length?garments:OPEN_WARDROBE;const offset=tier==="signature"?0:tier==="balance"?1:2;return pool[offset%pool.length];}

export async function POST(request:Request){
 if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:"Le moteur IA n'est pas encore configuré sur le serveur."},{status:503});
 try{
  const incoming=await request.formData();const portrait=incoming.get("portrait");const fullBody=incoming.get("fullBody");const tier=String(incoming.get("tier")||"").toLowerCase();const profile=String(incoming.get("profile")||"{}");
  if(!(portrait instanceof File)||!(fullBody instanceof File))return NextResponse.json({error:"Le portrait et la photo plein pied sont obligatoires."},{status:400});
  if(!TIERS.has(tier))return NextResponse.json({error:"Niveau de look invalide."},{status:400});
  if(portrait.size>10_000_000||fullBody.size>10_000_000)return NextResponse.json({error:"Chaque photo doit faire moins de 10 Mo."},{status:400});
  let parsed:Record<string,unknown>={};try{parsed=JSON.parse(profile)}catch{}
  const list=(key:string)=>Array.isArray(parsed[key])?(parsed[key] as unknown[]).map(String):[];
  const styles=list("styles"),colors=list("likedColors"),avoided=list("avoidColors"),garments=list("garmentTypes"),occasions=list("occasions");
  const silhouette=selectedSilhouette(tier,garments);
  const wedding=occasions.some(x=>x.toLowerCase().includes("mariée")||x.toLowerCase().includes("mariage"));
  const prompt=[
   "Create a photorealistic full-body fashion visualization of the exact same adult person shown in the supplied reference images.",
   "Reference image 1 is the portrait identity anchor. Reference image 2 is the full-body morphology and proportion anchor.",
   "Preserve facial identity, skin tone, hairstyle, apparent age, body proportions, height impression and morphology. Do not beautify, slim, enlarge, reshape, de-age or replace the person.",
   "Keep anatomy realistic, hands natural, and show the whole body from head to shoes.",
   `Create a ${tierDirection(tier)}. Preferred styles: ${styles.join(", ")||"open contemporary fashion"}. Preferred colors: ${colors.join(", ")||"harmonious colors"}. Avoid: ${avoided.join(", ")||"none"}.`,
   `For this generation, use a ${silhouette} as the main garment silhouette. Do not default to trousers when another selected silhouette is requested.`,
   garments.length?`The customer explicitly wants to explore these garment categories: ${garments.join(", ")}. Treat skirts, dresses, bodysuits, shorts, jumpsuits, sets and tailoring as equally valid choices when selected.`:"The customer left garment type open. Explore the full wardrobe and vary silhouettes rather than repeatedly defaulting to trousers.",
   occasions.length?`Intended occasions/univers: ${occasions.join(", ")}.`:"No specific occasion restriction.",
   wedding?"Wedding styling is explicitly enabled by the customer. If the selected occasion is bridal, a bridal gown or modern bridal alternative is allowed; if wedding guest, create an appropriate guest look. Do not assume bridal styling unless selected.":"Do not introduce bridal styling unless the customer explicitly selects it.",
   `Usual sizes if useful for visual proportion: top ${String(parsed.topSize||"unknown")}, bottom ${String(parsed.bottomSize||"unknown")}, shoes ${String(parsed.shoeSize||"unknown")}.`,
   "This is a style visualization, not a claim that any specific garment is an exact purchasable product. Neutral premium studio background, natural editorial lighting, realistic fabric drape."
  ].join(" ");
  const body=new FormData();body.append("model","gpt-image-2");body.append("prompt",prompt);body.append("size","1024x1536");body.append("quality","medium");body.append("image[]",portrait,portrait.name||"portrait.jpg");body.append("image[]",fullBody,fullBody.name||"full-body.jpg");
  const response=await fetch("https://api.openai.com/v1/images/edits",{method:"POST",headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body});const data=await response.json().catch(()=>({}));
  if(!response.ok){const providerMessage=String(data?.error?.message||"");console.error("OpenAI image edit failed",response.status,providerMessage||data);return NextResponse.json({error:providerMessage?`Génération refusée par le moteur IA : ${providerMessage}`:"La génération IA a échoué. Réessayez dans quelques instants."},{status:502});}
  const item=data?.data?.[0];if(item?.b64_json)return NextResponse.json({image:`data:image/png;base64,${item.b64_json}`,tier,model:"gpt-image-2",silhouette});if(item?.url)return NextResponse.json({image:item.url,tier,model:"gpt-image-2",silhouette});return NextResponse.json({error:"Le moteur IA n'a retourné aucune image."},{status:502});
 }catch(error){console.error("Try-On route error",error);return NextResponse.json({error:"Erreur serveur pendant la génération IA."},{status:500});}
}
