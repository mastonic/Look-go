import type { LookTier } from "./tryon";

export type RunwayRequest = {
  userId: string;
  tier: LookTier;
  validatedTryOnImageUrl: string;
  portraitReferenceUrl: string;
  durationSeconds?: number;
};

export type RunwayResult = {
  status: "queued" | "processing" | "completed" | "failed";
  videoUrl?: string;
  providerJobId?: string;
};

export interface RunwayProvider {
  generate(request: RunwayRequest): Promise<RunwayResult>;
}

export const RUNWAY_IDENTITY_RULES = [
  "Use the validated try-on image as the visual starting frame.",
  "Preserve the exact outfit from the starting image.",
  "Preserve facial identity using the portrait reference.",
  "Preserve body proportions and morphology; do not slim, enlarge or reshape the body.",
  "Use restrained natural motion to minimize identity drift.",
  "Natural slow runway walk, subtle 30-45 degree turn, stable face, realistic garment physics.",
] as const;

export function buildRunwayPrompt(request: RunwayRequest) {
  return [
    "Generate a photorealistic fashion runway clip from the supplied validated try-on image.",
    ...RUNWAY_IDENTITY_RULES,
    `Look tier: ${request.tier}.`,
    "Single continuous shot, premium fashion editorial lighting, no face replacement, no body transformation.",
  ].join(" ");
}
