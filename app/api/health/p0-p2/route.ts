import { NextResponse } from "next/server";
import { activeProviders } from "@/lib/ai/providers";

export const dynamic="force-dynamic";

export async function GET(){
 const firebaseVars={apiKey:Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),authDomain:Boolean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),projectId:Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),storageBucket:Boolean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),messagingSenderId:Boolean(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),appId:Boolean(process.env.NEXT_PUBLIC_FIREBASE_APP_ID)};
 const firebase=Object.values(firebaseVars).every(Boolean);
 const imageProviders=activeProviders("image").map(p=>p.id);
 const videoProviders=activeProviders("video").map(p=>p.id);
 const status={
  p0:{referencePhotosRequired:true,cloudPersistence:firebase,personalAccessCodeAuth:firebase,firebaseVars,imageProviders,videoProviders},
  p1:{feedbackSurvey:true,aiCostTelemetry:true,lookBranding:true,verifiedLookShopping:Boolean(process.env.BRAVE_SEARCH_API_KEY),costRatesConfigured:Boolean(process.env.AI_COST_OPENAI_IMAGE_USD||process.env.AI_COST_GOOGLE_IMAGE_USD)},
  legacy:{authSecretConfigured:Boolean(process.env.AUTH_SECRET)},
  commerce:{brandCatalog:true,sizeMapping:true,directLinkValidation:true,liveCommerceSearch:Boolean(process.env.BRAVE_SEARCH_API_KEY)}
 };
 const blockers:string[]=[];
 if(!firebase)blockers.push("firebase_env");
 if(!imageProviders.length)blockers.push("image_provider");
 if(!process.env.BRAVE_SEARCH_API_KEY)blockers.push("commerce_search_key");
 return NextResponse.json({ok:blockers.length===0,status,blockers,checkedAt:new Date().toISOString()},{headers:{"cache-control":"no-store"}});
}
