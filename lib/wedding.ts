import type { BetaProfile, WeddingEvent, WeddingOutfitPreference, WeddingRole } from "@/lib/beta-profile";

export type WeddingTier="signature"|"balance"|"smart";

const BRIDE_DEFAULT_COLORS=[
 "ivoire",
 "blanc cassé",
 "blanc naturel",
];

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
 // Bride auto-mode must stay bridal-first. Variations happen inside the bridal dress design,
 // not by drifting into generic wedding guest clothing.
 if(event?.role==="bride")return ["dress"];
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

function allowed(values:string[],avoided:string[]){return unique(values).filter(color=>!isAvoided(color,avoided));}

export function weddingColorOptions(profile:BetaProfile,limit=6){
 const event=profile.wedding;
 const avoided=unique([...(profile.avoidColors||[]),...(event?.avoidColors||[])]);
 const explicit=allowed(event?.requiredColors||[],avoided);

 if(event?.role==="bride"){
  // No arbitrary colourful fallback for a bride. Explicit wedding colors win; otherwise
  // use a conventional bridal palette first, then only her own allowed liked colors.
  const bridalDefaults=allowed(BRIDE_DEFAULT_COLORS,avoided);
  const liked=allowed(profile.likedColors||[],avoided);
  const pool=explicit.length?explicit:unique([...bridalDefaults,...liked]);
  return pool.slice(0,Math.max(1,limit));
 }

 const requested=allowed([...(event?.requiredColors||[]),...(profile.likedColors||[])],avoided);
 const fallback=allowed(FALLBACK_WEDDING_COLORS,avoided);
 return unique([...requested,...fallback]).slice(0,Math.max(1,limit));
}

export function weddingColorForTier(profile:BetaProfile,tier:WeddingTier){
 const event=profile.wedding;
 const avoided=unique([...(profile.avoidColors||[]),...(event?.avoidColors||[])]);
 const explicit=allowed(event?.requiredColors||[],avoided);
 let pool:string[]=[];

 if(explicit.length)pool=explicit;
 else if(event?.role==="bride")pool=weddingColorOptions(profile,6);
 else pool=allowed(profile.likedColors||[],avoided).length?allowed(profile.likedColors||[],avoided):weddingColorOptions(profile,12);

 if(!pool.length)return "couleur autorisée par le brief mariage";
 const index=tier==="signature"?0:tier==="balance"?1:2;
 return pool[index%pool.length];
}

export function weddingGenerationProfile(profile:BetaProfile):BetaProfile{
 const event=profile.wedding;
 if(!event?.enabled)return profile;

 // If a bride leaves outfit type on auto, normalize the generation brief to bridal dress.
 // This prevents the image route from rotating into guest-style jumpsuits/tailoring.
 const normalizedEvent:WeddingEvent=event.role==="bride"&&(event.outfitPreference||"auto")==="auto"
  ? {...event,outfitPreference:"dress"}
  : event;

 const eventProfile={...profile,wedding:normalizedEvent};
 const liked=normalizedEvent.requiredColors?.length
  ? normalizedEvent.requiredColors
  : normalizedEvent.role==="bride"
   ? weddingColorOptions(eventProfile,3)
   : profile.likedColors;
 const weddingOccasion=normalizedEvent.role==="bride"
  ? "Mariage · Mariée · robe de mariée / tenue nuptiale uniquement"
  : `Mariage · ${weddingRoleLabel(normalizedEvent.role)}`;

 return {
  ...profile,
  wedding:normalizedEvent,
  budget:Number(normalizedEvent.budget||profile.budget||200),
  trendBoldness:typeof normalizedEvent.boldness==="number"?normalizedEvent.boldness:profile.trendBoldness,
  garmentTypes:weddingGarments(normalizedEvent),
  likedColors:liked,
  avoidColors:unique([...(profile.avoidColors||[]),...(normalizedEvent.avoidColors||[])]),
  occasions:unique([...(profile.occasions||[]),weddingOccasion]),
 };
}

function bridalShoppingSilhouette(silhouette:string){
 const value=normalize(silhouette);
 if(value.includes("tailleur")||value.includes("suit")||value.includes("ensemble"))return "tailleur de mariée";
 if(value.includes("combinaison")||value.includes("jumpsuit"))return "combinaison de mariée";
 return "robe de mariée";
}

export function weddingShoppingQuery(profile:BetaProfile,silhouette:string,selectedColor?:string){
 const event=profile.wedding;
 const role=weddingRoleLabel(event?.role);
 const colors=selectedColor?[selectedColor]:(event?.requiredColors?.length?event.requiredColors:profile.likedColors||[]).slice(0,2);
 const style=[event?.dressCode,...(profile.styles||[]).slice(0,1)].filter(Boolean) as string[];

 if(event?.role==="bride"){
  // Search specifically for bridal products. "dress + wedding" is too broad and can return
  // coloured guest dresses that are technically marketed for weddings.
  return [bridalShoppingSilhouette(silhouette),"mariée","bridal","cérémonie",...style,...colors].filter(Boolean).join(" ");
 }

 return [silhouette,"tenue mariage",role,"cérémonie",...style,...colors].filter(Boolean).join(" ");
}
