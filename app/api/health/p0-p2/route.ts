import { NextResponse } from "next/server";
import { activeProviders } from "@/lib/ai/providers";
import { miyamiBaseUrl } from "@/lib/commerce/miyami";

export const dynamic="force-dynamic";

export async function GET(){
 const firebase=Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY&&process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN&&process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID&&process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET&&process.env.NEXT_PUBLIC_FIREBASE_APP_ID);
 const imageProviders=activeProviders("image").map(p=>p.id);
 const videoProviders=activeProviders("video").map(p=>p.id);
 let miyamiConfigured=false;
 try{miyamiConfigured=Boolean(miyamiBaseUrl())}catch{}
 const braveConfigured=Boolean(process.env.BRAVE_SEARCH_API_KEY);
 const status={
  p0:{referencePhotosRequired:true,cloudPersistence:firebase,passwordlessAuthCode:true,imageProviders,videoProviders,authSecret:Boolean(process.env.AUTH_SECRET)},
  p1:{feedbackSurvey:true,aiCostTelemetry:true,costRatesConfigured:Boolean(process.env.AI_COST_OPENAI_IMAGE_USD||process.env.AI_COST_GOOGLE_IMAGE_USD)},
  p2:{brandCatalog:true,sizeMapping:true,directLinkValidation:true,liveCommerceSearch:miyamiConfigured||braveConfigured,commerceSearch:{primary:miyamiConfigured?"miyami":null,secondary:braveConfigured?"brave":null,fallback:"merchant-directory"}}
 };
 const blockers:string[]=[];
 if(!firebase)blockers.push("firebase_env");
 if(!imageProviders.length)blockers.push("image_provider");
 if(!miyamiConfigured&&!braveConfigured)blockers.push("commerce_search_provider");
 if(!process.env.AUTH_SECRET)blockers.push("auth_secret_legacy_routes");
 return NextResponse.json({ok:blockers.length===0,status,blockers,checkedAt:new Date().toISOString()},{headers:{"cache-control":"no-store"}});
}
