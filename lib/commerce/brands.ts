export type LookTier="signature"|"balance"|"smart";
export type ShoppingCategory="blouse"|"shirt"|"blazer"|"dress"|"skirt"|"trousers"|"jeans"|"knitwear"|"coat"|"shoes"|"bag"|"accessory"|"basics"|"general";
export type MerchantBrand={id:string;name:string;tier:LookTier;domain:string;home:string;shipsFrance:boolean;notes?:string;strengths?:Partial<Record<ShoppingCategory,number>>};

export const MERCHANT_BRANDS:MerchantBrand[]=[
 {id:"hugoboss",name:"Hugo Boss",tier:"signature",domain:"hugoboss.com",home:"https://www.hugoboss.com/fr/",shipsFrance:true,strengths:{blouse:1,shirt:.9,blazer:1,trousers:.95,dress:.75,coat:.85,knitwear:.7,shoes:.55,bag:.55,accessory:.6,general:.75}},
 {id:"ralphlauren",name:"Ralph Lauren",tier:"signature",domain:"ralphlauren.fr",home:"https://www.ralphlauren.fr/",shipsFrance:true,strengths:{shirt:1,blouse:.8,knitwear:1,blazer:.85,dress:.75,coat:.8,jeans:.7,bag:.65,shoes:.6,accessory:.75,general:.75}},
 {id:"farfetch",name:"Farfetch",tier:"signature",domain:"farfetch.com",home:"https://www.farfetch.com/fr/",shipsFrance:true,notes:"Marketplace multimarque",strengths:{dress:.95,shoes:1,bag:1,accessory:1,coat:.9,blazer:.9,skirt:.9,trousers:.85,blouse:.85,shirt:.8,knitwear:.85,jeans:.8,general:.9}},
 {id:"sezane",name:"Sézane",tier:"balance",domain:"sezane.com",home:"https://www.sezane.com/fr",shipsFrance:true,strengths:{blouse:1,shirt:1,knitwear:1,dress:.95,skirt:.9,jeans:.75,trousers:.8,coat:.85,bag:.85,shoes:.75,accessory:.8,general:.9}},
 {id:"sandro",name:"Sandro",tier:"balance",domain:"fr.sandro-paris.com",home:"https://fr.sandro-paris.com/",shipsFrance:true,strengths:{dress:1,blazer:.95,skirt:.95,coat:.9,knitwear:.85,blouse:.8,trousers:.85,bag:.75,shoes:.7,general:.85}},
 {id:"maje",name:"Maje",tier:"balance",domain:"fr.maje.com",home:"https://fr.maje.com/",shipsFrance:true,strengths:{dress:1,skirt:1,blazer:.9,blouse:.85,knitwear:.85,coat:.85,trousers:.8,bag:.75,shoes:.7,general:.85}},
 {id:"cos",name:"COS",tier:"balance",domain:"cos.com",home:"https://www.cos.com/fr-fr/",shipsFrance:true,strengths:{basics:1,shirt:.9,blouse:.8,trousers:1,blazer:.9,knitwear:.95,coat:.9,dress:.8,skirt:.8,jeans:.7,general:.9}},
 {id:"massimodutti",name:"Massimo Dutti",tier:"balance",domain:"massimodutti.com",home:"https://www.massimodutti.com/fr/",shipsFrance:true,strengths:{shirt:1,blouse:.95,trousers:1,blazer:.95,coat:.95,knitwear:.9,jeans:.8,dress:.75,shoes:.8,bag:.75,general:.9}},
 {id:"zara",name:"Zara",tier:"smart",domain:"zara.com",home:"https://www.zara.com/fr/",shipsFrance:true,strengths:{dress:.95,blazer:.95,trousers:.95,skirt:.95,blouse:.9,shirt:.9,coat:.9,shoes:.85,bag:.85,knitwear:.8,jeans:.85,general:1}},
 {id:"mango",name:"Mango",tier:"smart",domain:"shop.mango.com",home:"https://shop.mango.com/fr",shipsFrance:true,strengths:{dress:1,blazer:.95,trousers:.95,blouse:.95,shirt:.9,coat:.9,skirt:.9,knitwear:.85,shoes:.8,bag:.8,general:1}},
 {id:"uniqlo",name:"Uniqlo",tier:"smart",domain:"uniqlo.com",home:"https://www.uniqlo.com/fr/fr/",shipsFrance:true,strengths:{basics:1,knitwear:1,shirt:.9,trousers:.9,jeans:.85,coat:.85,blouse:.65,dress:.55,general:.8}},
 {id:"asos",name:"ASOS",tier:"smart",domain:"asos.com",home:"https://www.asos.com/fr/",shipsFrance:true,strengths:{dress:1,shoes:1,bag:.9,accessory:.95,blouse:.9,skirt:.9,trousers:.85,jeans:.85,coat:.8,blazer:.85,general:1}},
 {id:"hm",name:"H&M",tier:"smart",domain:"hm.com",home:"https://www2.hm.com/fr_fr/",shipsFrance:true,strengths:{basics:1,dress:.9,blouse:.9,shirt:.85,trousers:.9,skirt:.9,knitwear:.9,jeans:.85,coat:.8,accessory:.8,general:.95}},
 {id:"kiabi",name:"Kiabi",tier:"smart",domain:"kiabi.com",home:"https://www.kiabi.com/",shipsFrance:true,strengths:{basics:1,jeans:.9,trousers:.9,blouse:.85,shirt:.8,dress:.85,skirt:.85,knitwear:.8,coat:.75,general:.9}}
];

function normalize(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function includesAny(value:string,words:string[]){return words.some(word=>value.includes(word))}
function stableHash(value:string){let hash=0;for(let i=0;i<value.length;i++)hash=((hash<<5)-hash+value.charCodeAt(i))|0;return Math.abs(hash)}

export function inferShoppingCategory(query:string):ShoppingCategory{
 const q=normalize(query);
 if(includesAny(q,["chemisier","blouse","blouses"]))return "blouse";
 if(includesAny(q,["chemise","chemises","shirt"]))return "shirt";
 if(includesAny(q,["blazer","veste tailleur","veste de costume"]))return "blazer";
 if(includesAny(q,["robe","robes","combinaison","jumpsuit"]))return "dress";
 if(includesAny(q,["jupe","jupes"]))return "skirt";
 if(includesAny(q,["pantalon","pantalons","tailleur pantalon"]))return "trousers";
 if(includesAny(q,["jean","jeans","denim"]))return "jeans";
 if(includesAny(q,["pull","maille","cardigan","gilet","sweat"]))return "knitwear";
 if(includesAny(q,["manteau","trench","parka","doudoune","veste hiver"]))return "coat";
 if(includesAny(q,["chaussure","chaussures","sandale","sandales","escarpin","escarpins","sneaker","sneakers","basket","baskets","botte","bottes","bottine","bottines","mocassin","mocassins"]))return "shoes";
 if(includesAny(q,["sac","sacs","pochette","pochettes","cabas"]))return "bag";
 if(includesAny(q,["ceinture","foulard","bijou","bijoux","lunettes","chapeau","accessoire","accessoires"]))return "accessory";
 if(includesAny(q,["t shirt","tee shirt","debardeur","basique","basics"]))return "basics";
 return "general";
}

export function brandsForTier(tier?:string){return tier?MERCHANT_BRANDS.filter(b=>b.tier===tier):MERCHANT_BRANDS}
export function findMerchantByUrl(url:string){try{const host=new URL(url).hostname.toLowerCase().replace(/^www\./,"");return MERCHANT_BRANDS.find(b=>host===b.domain||host.endsWith(`.${b.domain}`)||b.domain.endsWith(`.${host}`))||null}catch{return null}}
export function merchantDomains(tier?:string){return brandsForTier(tier).map(b=>b.domain)}

export function rankBrandsForShopping(input:{tier?:string;query:string;preferredBrands?:string[]}){
 const all=brandsForTier(input.tier);
 const q=normalize(input.query);
 const explicit=all.filter(brand=>q.includes(normalize(brand.name))||q.includes(normalize(brand.id)));
 if(explicit.length)return explicit;
 const category=inferShoppingCategory(input.query);
 const preferred=new Set((input.preferredBrands||[]).map(normalize));
 const offset=all.length?stableHash(`${q}:${input.tier||"all"}`)%all.length:0;
 return all.map((brand,index)=>{
  const affinity=brand.strengths?.[category]??brand.strengths?.general??.5;
  const isPreferred=preferred.has(normalize(brand.id))||preferred.has(normalize(brand.name));
  const preference=isPreferred?.22:0;
  const diversity=((index-offset+all.length)%all.length)/Math.max(1,all.length)*.025;
  return {brand,score:affinity+preference-diversity};
 }).sort((a,b)=>b.score-a.score).map(item=>item.brand);
}
