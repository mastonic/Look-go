export type BetaProfile={email?:string;pseudo?:string;height?:number;weight?:number;age?:number;hair?:string;portraitName?:string;fullName?:string;styles?:string[];garmentTypes?:string[];occasions?:string[];topSize?:string;bottomSize?:string;shoeSize?:string;likedColors?:string[];avoidColors?:string[];brands?:string[];budget?:number;budgetMode?:string;avoidBrands?:string;complete?:boolean};

const KEY="lookgo_beta_profile_v1";

export function readBetaProfile():BetaProfile{
 if(typeof window==="undefined") return {};
 try{return JSON.parse(localStorage.getItem(KEY)||"{}") as BetaProfile}catch{return {}}
}

export function saveBetaProfile(patch:Partial<BetaProfile>){
 if(typeof window==="undefined") return;
 const current=readBetaProfile();
 localStorage.setItem(KEY,JSON.stringify({...current,...patch}));
}

export function clearBetaProfile(){if(typeof window!=="undefined") localStorage.removeItem(KEY)}
