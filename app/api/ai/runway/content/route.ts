import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request:Request){
  if(!process.env.OPENAI_API_KEY) return NextResponse.json({error:"Le moteur vidéo n'est pas configuré."},{status:503});
  const id=new URL(request.url).searchParams.get("id")||"";
  if(!/^video_[A-Za-z0-9_-]+$/.test(id)) return NextResponse.json({error:"Identifiant vidéo invalide."},{status:400});
  try{
    const response=await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(id)}/content`,{
      headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},
      cache:"no-store",
    });
    if(!response.ok) return NextResponse.json({error:"La vidéo n'est pas encore disponible."},{status:502});
    const bytes=await response.arrayBuffer();
    return new Response(bytes,{
      status:200,
      headers:{
        "content-type":response.headers.get("content-type")||"video/mp4",
        "cache-control":"private, no-store",
        "content-disposition":`inline; filename="lookgo-runway-${id}.mp4"`,
      },
    });
  }catch(error){
    console.error("Runway content route error",error);
    return NextResponse.json({error:"Erreur pendant la récupération du défilé."},{status:500});
  }
}
