import { NextResponse } from "next/server";
import { sizeAdvice } from "@/lib/commerce/sizing";

export async function POST(request:Request){
 try{const body=await request.json() as {topSize?:string;bottomSize?:string;shoeSize?:string};return NextResponse.json(sizeAdvice({top:body.topSize,bottom:body.bottomSize,shoe:body.shoeSize}))}catch{return NextResponse.json({error:"Tailles invalides."},{status:400})}
}
