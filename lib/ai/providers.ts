export type AiProviderId="openai"|"google"|"anthropic"|"higgsfield";
export type AiCapability="stylist"|"image"|"video";
export type ProviderConfig={id:AiProviderId;label:string;enabled:boolean;capabilities:AiCapability[];configured:boolean};

export const ADMIN_EMAIL="rigahludovic@gmail.com";

const META:Record<AiProviderId,{label:string;capabilities:AiCapability[];env:string}>={
 openai:{label:"OpenAI",capabilities:["stylist","image","video"],env:"OPENAI_API_KEY"},
 google:{label:"Google",capabilities:["stylist","image","video"],env:"GOOGLE_AI_API_KEY"},
 anthropic:{label:"Claude",capabilities:["stylist"],env:"ANTHROPIC_API_KEY"},
 higgsfield:{label:"Higgsfield",capabilities:["image","video"],env:"HIGGSFIELD_API_KEY"},
};

export function providerConfig():ProviderConfig[]{
 return (Object.keys(META) as AiProviderId[]).map(id=>({id,label:META[id].label,capabilities:META[id].capabilities,enabled:process.env[`AI_${id.toUpperCase()}_ENABLED`]!=="false",configured:Boolean(process.env[META[id].env])}));
}

export function activeProviders(capability:AiCapability){return providerConfig().filter(p=>p.enabled&&p.configured&&p.capabilities.includes(capability));}
