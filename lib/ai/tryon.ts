export type LookTier = "signature" | "balance" | "smart";

export type VisualReference = {
  portraitUrl: string;
  fullBodyUrl: string;
};

export type GarmentReference = {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
};

export type TryOnRequest = {
  userId: string;
  tier: LookTier;
  visualReference: VisualReference;
  garments: GarmentReference[];
};

export type TryOnResult = {
  status: "queued" | "processing" | "completed" | "failed";
  imageUrl?: string;
  providerJobId?: string;
};

/**
 * Contract for the production VTO adapter.
 * The provider implementation must receive BOTH the portrait identity reference
 * and the full-body morphology reference. A result must never be presented as
 * identity-faithful unless it was generated from these user-owned references.
 */
export interface TryOnProvider {
  generate(request: TryOnRequest): Promise<TryOnResult>;
}

export const TRYON_IDENTITY_RULES = [
  "Preserve the person's facial identity from the portrait reference.",
  "Preserve body proportions and apparent morphology from the full-body reference.",
  "Do not intentionally slim, enlarge, reshape or beautify the person's body.",
  "Preserve skin tone, hair identity and visible facial characteristics.",
  "Change clothing only as required by the selected garments.",
  "Keep garment construction, colors and distinctive details faithful to product references.",
] as const;

export function buildTryOnPrompt(request: TryOnRequest) {
  const garmentList = request.garments.map((g) => `${g.category}: ${g.name}`).join(", ");
  return [
    "Create a photorealistic virtual try-on using the supplied user references and garment references.",
    ...TRYON_IDENTITY_RULES,
    `Look tier: ${request.tier}.`,
    `Garments: ${garmentList}.`,
    "Natural editorial fashion photograph, realistic fabric drape, realistic anatomy, no identity substitution.",
  ].join(" ");
}
