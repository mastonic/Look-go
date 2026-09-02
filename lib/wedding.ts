import type { BetaProfile, WeddingEvent, WeddingOutfitPreference, WeddingRole } from "@/lib/beta-profile";

export type WeddingTier="signature"|"balance"|"smart";

const FALLBACK_WEDDING_COLORS=[
 "vert émeraude",
 "rose poudré",
 "bleu nuit",
 "vert sauge",
 "terracotta",
 "prune",
 "bleu pétrole",
 "lavande grisée",
 "cuivre rosé",
 "bordeaux",
 "corail doux",
 "nude rosé",
];

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

function cleanColor(value:string){return value.trim().replace(/\s+/g," ");}
function normalize(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();}
function unique(values:string[]){return Array.from(new Set(values.map(cleanColor).filter(Boolean)));}
function isAvoided(color:string,avoided:string[]){
 const target=normalize(color);
 return avoided.some(value=>{
  const item=normalize(value);
  return item===target||item.includes(target)||target.includes(item);
 });
}

export function weddingColorOptions(profile:BetaProfile,limit=6){
 const event=profile.wedding;
 const avoided=unique([...(profile.avoidColors||[]),...(event?.avoidColors||[])]);
 const requested=unique([...(event?.requiredColors||[]),...(profile.likedColors||[])]).filter(color=>!isAvoided(color,avoided));
 const fallback=FALLBACK_WEDDING_COLORS.filter(color=>!isAvoided(color,avoided));
 return unique([...requested,...fallback]).slice(0,Math.max(1,limit));
}

export function weddingColorForTier(profile:BetaProfile,tier:WeddingTier){
 const event=profile.wedding;
 const avoided=unique([...(profile.avoidColors||[]),...(event?.avoidColors||[])]);
 const requested=unique(event?.requiredColors?.length?event.requiredColors:(profile.likedColors||[])).filter(color=>!isAvoided(color,avoided));
 const pool=requested.length?requested:weddingColorOptions(profile,12);
 if(!pool.length)return "couleur élégante personnalisée";
 const index=tier==="signature"?0:tier==="balance"?1:2;
 return pool[index%pool.length];
}

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

export function weddingShoppingQuery(profile:BetaProfile,silhouette:string,selectedColor?:string){
 const event=profile.wedding;
 const role=weddingRoleLabel(event?.role);
 const colors=selectedColor?[selectedColor]:(event?.requiredColors?.length?event.requiredColors:profile.likedColors||[]).slice(0,2);
 const style=[event?.dressCode,...(profile.styles||[]).slice(0,1)].filter(Boolean) as string[];
 return [silhouette,"mariage",role,...style,...colors].filter(Boolean).join(" ");
}
