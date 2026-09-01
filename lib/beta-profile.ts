export type TrendPreference="trend"|"balanced"|"timeless"|"personalized";

export type BetaProfile={
 email?:string;
 pseudo?:string;
 height?:number;
 weight?:number;
 age?:number;
 hair?:string;
 portraitName?:string;
 fullName?:string;
 styles?:string[];
 garmentTypes?:string[];
 occasions?:string[];
 topSize?:string;
 bottomSize?:string;
 shoeSize?:string;
 likedColors?:string[];
 avoidColors?:string[];
 brands?:string[];
 budget?:number;
 budgetMode?:string;
 avoidBrands?:string;
 complete?:boolean;
 codeConfigured?:boolean;
 trendPreference?:TrendPreference;
 trendBoldness?:number;
};

const KEY="lookgo_beta_profile_v1";
const BACKUP_KEY="lookgo_beta_profile_backup_v1";

export function readBetaProfile():BetaProfile{
 if(typeof window==="undefined") return {};
 try{return JSON.parse(localStorage.getItem(KEY)||"{}") as BetaProfile}catch{return {}}
}

export function readBetaProfileBackup():BetaProfile{
 if(typeof window==="undefined") return {};
 try{return JSON.parse(localStorage.getItem(BACKUP_KEY)||"{}") as BetaProfile}catch{return {}}
}

export function saveBetaProfile(patch:Partial<BetaProfile>){
 if(typeof window==="undefined") return;
 const current=readBetaProfile();
 const next={...current,...patch};
 localStorage.setItem(KEY,JSON.stringify(next));
 localStorage.setItem(BACKUP_KEY,JSON.stringify(next));
 void import("@/lib/beta-profile-cloud-fallback").then(module=>module.saveBetaProfileSnapshot(next)).catch(()=>{});
}

export function clearBetaProfile(){
 if(typeof window==="undefined")return;
 const current=readBetaProfile();
 if(Object.keys(current).length>0)localStorage.setItem(BACKUP_KEY,JSON.stringify(current));
 localStorage.removeItem(KEY);
}
