export type SizeProfile={top?:string;bottom?:string;shoe?:string};

const alphaToEu:Record<string,number[]>={XS:[32,34],S:[34,36],M:[38,40],L:[42,44],XL:[46,48],XXL:[50,52],"3XL":[54,56]};

export function normalizeAlphaSize(value?:string){const v=(value||"").trim().toUpperCase();return Object.keys(alphaToEu).includes(v)?v:""}
export function euRangeForAlpha(value?:string){const key=normalizeAlphaSize(value);return key?alphaToEu[key]:[]}
export function alphaForEu(value?:string|number){const n=Number(value);if(!Number.isFinite(n))return "";for(const [alpha,range] of Object.entries(alphaToEu))if(n>=range[0]&&n<=range[1])return alpha;return ""}
export function buildSizeSearchTerms(profile:SizeProfile){const terms:string[]=[];if(profile.top){terms.push(`taille ${profile.top}`);for(const eu of euRangeForAlpha(profile.top))terms.push(`EU ${eu}`)}if(profile.bottom)terms.push(`bas EU ${profile.bottom}`);if(profile.shoe)terms.push(`pointure ${profile.shoe}`);return Array.from(new Set(terms))}
export function sizeAdvice(profile:SizeProfile){return {top:{input:profile.top||null,eu:euRangeForAlpha(profile.top)},bottom:{input:profile.bottom||null,alpha:alphaForEu(profile.bottom)},shoe:{input:profile.shoe||null,system:"EU"},warning:"Toujours vérifier le guide de taille du produit : les coupes et mesures varient selon la marque et le modèle."}}
