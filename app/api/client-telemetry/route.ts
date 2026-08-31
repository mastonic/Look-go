import { NextResponse } from "next/server";

export const runtime="nodejs";

export async function POST(request:Request){
 try{
  const body=await request.json().catch(()=>({}));
  const event=String(body?.event||"client_event").slice(0,80);
  const detail=JSON.stringify(body?.detail||{}).slice(0,3000);
  console.info(`[client-telemetry] ${event} ${detail}`);
  return NextResponse.json({ok:true});
 }catch{
  return NextResponse.json({ok:false},{status:400});
 }
}
