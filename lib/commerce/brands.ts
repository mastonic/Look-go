export type LookTier="signature"|"balance"|"smart";
export type MerchantBrand={id:string;name:string;tier:LookTier;domain:string;home:string;searchPath?:string;shipsFrance:boolean;notes?:string};

export const MERCHANT_BRANDS:MerchantBrand[]=[
 {id:"hugoboss",name:"Hugo Boss",tier:"signature",domain:"hugoboss.com",home:"https://www.hugoboss.com/fr/",shipsFrance:true},
 {id:"ralphlauren",name:"Ralph Lauren",tier:"signature",domain:"ralphlauren.fr",home:"https://www.ralphlauren.fr/",shipsFrance:true},
 {id:"farfetch",name:"Farfetch",tier:"signature",domain:"farfetch.com",home:"https://www.farfetch.com/fr/",shipsFrance:true,notes:"Marketplace multimarque"},
 {id:"sezane",name:"Sézane",tier:"balance",domain:"sezane.com",home:"https://www.sezane.com/fr",shipsFrance:true},
 {id:"sandro",name:"Sandro",tier:"balance",domain:"fr.sandro-paris.com",home:"https://fr.sandro-paris.com/",shipsFrance:true},
 {id:"maje",name:"Maje",tier:"balance",domain:"fr.maje.com",home:"https://fr.maje.com/",shipsFrance:true},
 {id:"cos",name:"COS",tier:"balance",domain:"cos.com",home:"https://www.cos.com/fr-fr/",shipsFrance:true},
 {id:"massimodutti",name:"Massimo Dutti",tier:"balance",domain:"massimodutti.com",home:"https://www.massimodutti.com/fr/",shipsFrance:true},
 {id:"zara",name:"Zara",tier:"smart",domain:"zara.com",home:"https://www.zara.com/fr/",shipsFrance:true},
 {id:"mango",name:"Mango",tier:"smart",domain:"shop.mango.com",home:"https://shop.mango.com/fr",shipsFrance:true},
 {id:"uniqlo",name:"Uniqlo",tier:"smart",domain:"uniqlo.com",home:"https://www.uniqlo.com/fr/fr/",shipsFrance:true},
 {id:"asos",name:"ASOS",tier:"smart",domain:"asos.com",home:"https://www.asos.com/fr/",shipsFrance:true},
 {id:"hm",name:"H&M",tier:"smart",domain:"hm.com",home:"https://www2.hm.com/fr_fr/",shipsFrance:true},
 {id:"kiabi",name:"Kiabi",tier:"smart",domain:"kiabi.com",home:"https://www.kiabi.com/",shipsFrance:true}
];

export function brandsForTier(tier?:string){return tier?MERCHANT_BRANDS.filter(b=>b.tier===tier):MERCHANT_BRANDS}
export function findMerchantByUrl(url:string){try{const host=new URL(url).hostname.toLowerCase().replace(/^www\./,"");return MERCHANT_BRANDS.find(b=>host===b.domain||host.endsWith(`.${b.domain}`)||b.domain.endsWith(`.${host}`))||null}catch{return null}}
export function merchantDomains(tier?:string){return brandsForTier(tier).map(b=>b.domain)}
