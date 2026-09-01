import type { BetaProfile, WeddingEvent, WeddingOutfitPreference, WeddingRole } from "@/lib/beta-profile";

export function weddingRoleLabel(role?:WeddingRole){
 if(role==="bride")return "Mariée";
 if(role==="maid")return "Témoin / demoiselle d’honneur";
 if(role==="mother")return "Mère de la mariée / du marié";
 return "Invitée";
}

export function weddingOutfitLabel(value?:WeddingOutfitPreference){
 if(value==="dress")return "Robe";
 if(value==="tailored")return "Tailleur / ensemble";
 if(value==="jumpsuit")return "Combinaison";
 return "Laisser l’IA choisir";
}

export function weddingGarments(event?:WeddingEvent){
 const preference=event?.outfitPreference||"auto";
 if(preference==="dress")return ["dress"];
 if(preference==="tailored")return ["tailored suit","matching set","shirt-and-skirt look"];
 if(preference==="jumpsuit")return ["jumpsuit"];
 if(event?.role==="bride")return ["dress","tailored suit","jumpsuit"];
 return ["dress","jumpsuit","tailored suit"];
}

function unique(values:string[]){return Array.from(new Set(values.map(v=>v.trim()).filter(Boolean)));}

export function weddingGenerationProfile(profile:BetaProfile):BetaProfile{
 const event=profile.wedding;
 if(!event?.enabled)return profile;
 const liked=event.requiredColors?.length?event.requiredColors:profile.likedColors;
 return {
  ...profile,
  budget:Number(event.budget||profile.budget||200),
  trendBoldness:typeof event.boldness==="number"?event.boldness:profile.trendBoldness,
  garmentTypes:weddingGarments(event),
  likedColors:liked,
  avoidColors:unique([...(profile.avoidColors||[]),...(event.avoidColors||[])]),
  occasions:unique([...(profile.occasions||[]),`Mariage · ${weddingRoleLabel(event.role)}`]),
 };
}

export function weddingShoppingQuery(profile:BetaProfile,silhouette:string){
 const event=profile.wedding;
 const role=weddingRoleLabel(event?.role);
 const colors=(event?.requiredColors?.length?event.requiredColors:profile.likedColors||[]).slice(0,2);
 const style=[event?.dressCode,...(profile.styles||[]).slice(0,1)].filter(Boolean) as string[];
 return [silhouette,"mariage",role,...style,...colors].filter(Boolean).join(" ");
}
