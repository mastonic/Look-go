import type { BetaProfile } from "@/lib/beta-profile";

export function hasBetaIdentity(profile:BetaProfile){
  return Boolean(profile.email || profile.pseudo);
}

export function betaResumePath(profile:BetaProfile){
  if(profile.complete) return "/profil";
  const identityReady=Boolean(
    profile.email &&
    profile.pseudo &&
    profile.height &&
    profile.weight &&
    profile.age &&
    profile.portraitName &&
    profile.fullName
  );
  return identityReady ? "/inscription/style" : "/inscription";
}
