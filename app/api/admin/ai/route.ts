import {NextResponse} from "next/server";
import {providerConfig} from "@/lib/ai/providers";
export const dynamic="force-dynamic";
export async function GET(){return NextResponse.json({providers:providerConfig().map(({id,label,enabled,configured,capabilities})=>({id,label,enabled,configured,capabilities}))});}
