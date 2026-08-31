export function validBetaAccessCode(code:string){return /^\d{6}$/.test(code)}

export function sanitizeBetaProfileForCloud<T extends Record<string,unknown>>(profile:T){
 const safe={...profile} as Record<string,unknown>;
 delete safe.codeConfigured;
 delete safe.code;
 delete safe.personalCode;
 delete safe.accessCode;
 delete safe.accessCodeValue;
 return safe;
}
