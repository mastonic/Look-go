import {NextResponse} from "next/server";
import {ADMIN_EMAIL,providerConfig,type AiProviderId} from "@/lib/ai/providers";

export const dynamic="force-dynamic";
export const runtime="nodejs";

const PROJECT_ID=process.env.VERCEL_PROJECT_ID||"prj_pB0fwoTSSKch43iEIhLhWXgdeKAF";
const TEAM_ID=process.env.VERCEL_ORG_ID||"team_A7zI4peSDI0BPTedg6CHWC4A";
const PROJECT_NAME="look-go";
const PROVIDER_ENV:Record<AiProviderId,string>={openai:"OPENAI_API_KEY",google:"GOOGLE_AI_API_KEY",anthropic:"ANTHROPIC_API_KEY",higgsfield:"HIGGSFIELD_API_KEY"};

function isAdmin(request:Request){return String(request.headers.get("x-lookgo-admin-email")||"").trim().toLowerCase()===ADMIN_EMAIL;}
function enabledEnv(provider:AiProviderId){return `AI_${provider.toUpperCase()}_ENABLED`;}
function vercelHeaders(){return {Authorization:`Bearer ${process.env.VERCEL_TOKEN}`,"Content-Type":"application/json"};}

export async function GET(request:Request){
 if(!isAdmin(request))return NextResponse.json({error:"Accès refusé."},{status:403});
 return NextResponse.json({providers:providerConfig().map(({id,label,enabled,configured,capabilities})=>({id,label,enabled,configured,capabilities})),canManage:Boolean(process.env.VERCEL_TOKEN)});
}

async function upsertEnv(items:{key:string;value:string;type:"plain"|"sensitive"}[]){
 const response=await fetch(`https://api.vercel.com/v10/projects/${PROJECT_ID}/env?upsert=true&teamId=${TEAM_ID}`,{method:"POST",headers:vercelHeaders(),body:JSON.stringify(items.map(item=>({...item,target:["production","preview"]})))});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(String(body?.error?.message||body?.message||"Échec de mise à jour Vercel"));
}

async function redeploy(){
 const list=await fetch(`https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&target=production&limit=1&teamId=${TEAM_ID}`,{headers:{Authorization:`Bearer ${process.env.VERCEL_TOKEN}`}});
 const data=await list.json().catch(()=>({}));
 const deploymentId=data?.deployments?.[0]?.uid;
 if(!deploymentId)return null;
 const response=await fetch(`https://api.vercel.com/v13/deployments?teamId=${TEAM_ID}`,{method:"POST",headers:vercelHeaders(),body:JSON.stringify({name:PROJECT_NAME,deploymentId,target:"production"})});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(String(body?.error?.message||body?.message||"Clés enregistrées, mais redéploiement impossible"));
 return {id:body?.id||body?.uid||null,url:body?.url||null};
}

export async function POST(request:Request){
 if(!isAdmin(request))return NextResponse.json({error:"Accès refusé."},{status:403});
 if(!process.env.VERCEL_TOKEN)return NextResponse.json({error:"Gestion distante non configurée : ajoutez VERCEL_TOKEN une seule fois dans Vercel."},{status:503});
 const body=await request.json().catch(()=>null) as {provider?:AiProviderId;enabled?:boolean;apiKey?:string}|null;
 const provider=body?.provider;
 if(!provider||!(provider in PROVIDER_ENV))return NextResponse.json({error:"Moteur invalide."},{status:400});
 if(typeof body?.enabled!=="boolean")return NextResponse.json({error:"État du moteur invalide."},{status:400});
 const apiKey=String(body?.apiKey||"").trim();
 const updates:{key:string;value:string;type:"plain"|"sensitive"}[]=[{key:enabledEnv(provider),value:body.enabled?"true":"false",type:"plain"}];
 if(apiKey)updates.push({key:PROVIDER_ENV[provider],value:apiKey,type:"sensitive"});
 try{
  await upsertEnv(updates);
  const deployment=await redeploy();
  return NextResponse.json({ok:true,message:"Configuration enregistrée. Un redéploiement de production a été lancé.",deployment});
 }catch(error){
  console.error("Admin AI settings update failed",error);
  return NextResponse.json({error:error instanceof Error?error.message:"Impossible d’enregistrer la configuration."},{status:502});
 }
}
