import {NextResponse} from "next/server";

export const runtime="nodejs";
export const maxDuration=60;

const CATEGORIES=new Set(["haut","bas","robe","veste","chaussures","sac","accessoire","autre"]);
const PROMPT=`Tu es Look&Go Vision, un moteur d'inventaire de dressing. Analyse UNIQUEMENT les vêtements, chaussures, sacs et accessoires réellement visibles sur la photo. Ne devine pas les pièces cachées. Sépare les pièces distinctes quand cela est raisonnablement visible. Retourne uniquement un JSON valide sous la forme {"items":[...]}. Pour chaque item: name (français, court et précis), category parmi haut|bas|robe|veste|chaussures|sac|accessoire|autre, subcategory, primaryColor, secondaryColors (tableau), pattern, material (si identifiable sinon "inconnu"), style (tableau de 1 à 4 tags), season (tableau parmi printemps|été|automne|hiver), confidence (0 à 1). Pas de texte hors JSON. Limite à 30 pièces par image et privilégie la précision à la quantité.`;

function toBase64(file:File){return file.arrayBuffer().then(b=>Buffer.from(b).toString("base64"))}
function cleanText(value:unknown,max=80){return String(value||"").replace(/\s+/g," ").trim().slice(0,max)}
function cleanList(value:unknown,max=6){return Array.isArray(value)?value.map(v=>cleanText(v,40)).filter(Boolean).slice(0,max):[]}
function normalize(raw:unknown){
 const obj=raw&&typeof raw==="object"?raw as Record<string,unknown>:{};
 const arr=Array.isArray(obj.items)?obj.items:[];
 return arr.slice(0,30).map((entry,index)=>{
  const item=entry&&typeof entry==="object"?entry as Record<string,unknown>:{};
  const categoryRaw=cleanText(item.category,20).toLowerCase();
  const category=CATEGORIES.has(categoryRaw)?categoryRaw:"autre";
  const confidence=Math.max(0,Math.min(1,Number(item.confidence??0.65)||0.65));
  return {index,name:cleanText(item.name,70)||`Pièce ${index+1}`,category,subcategory:cleanText(item.subcategory,60),primaryColor:cleanText(item.primaryColor,40)||"inconnue",secondaryColors:cleanList(item.secondaryColors,4),pattern:cleanText(item.pattern,40)||"uni",material:cleanText(item.material,40)||"inconnu",style:cleanList(item.style,4),season:cleanList(item.season,4),confidence};
 });
}
function parseJson(text:string){
 const trimmed=text.trim().replace(/^```json\s*/i,"").replace(/```$/i,"").trim();
 return JSON.parse(trimmed) as Record<string,unknown>;
}
async function openAi(file:File){
 const key=process.env.OPENAI_API_KEY;if(!key)throw new Error("OPENAI_NOT_CONFIGURED");
 const model=process.env.OPENAI_VISION_MODEL||"gpt-4.1-mini";const base64=await toBase64(file);
 const response=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,temperature:0.1,response_format:{type:"json_object"},messages:[{role:"system",content:PROMPT},{role:"user",content:[{type:"text",text:"Analyse cette photo de dressing et inventorie les pièces visibles."},{type:"image_url",image_url:{url:`data:${file.type||"image/jpeg"};base64,${base64}`,detail:"high"}}]}]})});
 const data=await response.json().catch(()=>({})) as Record<string,any>;
 if(!response.ok)throw new Error(`OPENAI_HTTP_${response.status}`);
 const text=String(data?.choices?.[0]?.message?.content||"");if(!text)throw new Error("OPENAI_EMPTY");
 return {items:normalize(parseJson(text)),provider:"openai",model};
}
async function google(file:File){
 const key=process.env.GOOGLE_AI_API_KEY;if(!key)throw new Error("GOOGLE_NOT_CONFIGURED");
 const model=process.env.GOOGLE_VISION_MODEL||"gemini-2.5-flash";const base64=await toBase64(file);
 const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{role:"user",parts:[{text:PROMPT},{inline_data:{mime_type:file.type||"image/jpeg",data:base64}}]}],generationConfig:{temperature:0.1,responseMimeType:"application/json"}})});
 const data=await response.json().catch(()=>({})) as Record<string,any>;
 if(!response.ok)throw new Error(`GOOGLE_HTTP_${response.status}`);
 const text=String(data?.candidates?.[0]?.content?.parts?.[0]?.text||"");if(!text)throw new Error("GOOGLE_EMPTY");
 return {items:normalize(parseJson(text)),provider:"google",model};
}

export async function POST(request:Request){
 try{
  const form=await request.formData();const file=form.get("image");
  if(!(file instanceof File))return NextResponse.json({error:"Ajoutez une photo de votre dressing."},{status:400});
  if(!file.type.startsWith("image/"))return NextResponse.json({error:"Le fichier doit être une image."},{status:400});
  if(file.size>12*1024*1024)return NextResponse.json({error:"La photo doit faire moins de 12 Mo."},{status:400});
  const errors:string[]=[];
  for(const provider of [openAi,google]){
   try{const result=await provider(file);console.info("WARDROBE_SCAN_SUCCESS",JSON.stringify({provider:result.provider,model:result.model,count:result.items.length}));return NextResponse.json(result)}catch(error){errors.push(error instanceof Error?error.message:"UNKNOWN")}
  }
  console.error("WARDROBE_SCAN_FAILED",errors.join(","));
  return NextResponse.json({error:"L’analyse du dressing est momentanément indisponible. Réessayez dans quelques instants.",codes:errors},{status:503});
 }catch(error){console.error("WARDROBE_SCAN_ERROR",error);return NextResponse.json({error:"Impossible d’analyser cette photo."},{status:500})}
}
