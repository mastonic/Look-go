export type AiCostMeta={provider:string;model:string;operation:"image"|"video";estimatedCostUsd:number|null;durationMs:number};

function envNumber(name:string){const raw=process.env[name];if(!raw)return null;const n=Number(raw);return Number.isFinite(n)&&n>=0?n:null}

export function estimateAiCostUsd(provider:string,operation:"image"|"video"){
 const key=provider.toUpperCase().replace(/[^A-Z0-9]/g,"_");
 return envNumber(`AI_COST_${key}_${operation.toUpperCase()}_USD`);
}

export function buildAiCostMeta(provider:string,model:string,operation:"image"|"video",durationMs:number):AiCostMeta{
 return {provider,model,operation,estimatedCostUsd:estimateAiCostUsd(provider,operation),durationMs};
}
