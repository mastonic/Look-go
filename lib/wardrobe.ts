export const WARDROBE_CATEGORIES = [
  "tops",
  "bottoms",
  "dresses",
  "outerwear",
  "shoes",
  "bags",
  "accessories",
  "sets",
  "other",
] as const;

export type WardrobeCategory = (typeof WARDROBE_CATEGORIES)[number];

export const WARDROBE_CATEGORY_LABELS: Record<WardrobeCategory, string> = {
  tops: "Hauts",
  bottoms: "Bas",
  dresses: "Robes",
  outerwear: "Vestes & manteaux",
  shoes: "Chaussures",
  bags: "Sacs",
  accessories: "Accessoires",
  sets: "Ensembles",
  other: "Autres",
};

export type WardrobeBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WardrobeDetection = {
  tempId: string;
  sourceImageIndex: number;
  category: WardrobeCategory;
  categoryLabel: string;
  subcategory: string;
  garmentType: string;
  primaryColor: string;
  secondaryColors: string[];
  pattern: string;
  styles: string[];
  materialGuess: string;
  seasons: string[];
  occasions: string[];
  visualSignature: string;
  bbox: WardrobeBoundingBox;
  confidence: number;
  notes: string;
};

export type WardrobeItem = WardrobeDetection & {
  id: string;
  sourcePhotoPath?: string;
  duplicateKey: string;
  userValidated: boolean;
  aiGenerated: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value: string) {
  return new Set(normalize(value).split(" ").filter(Boolean));
}

function tokenSimilarity(a: string, b: string) {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  left.forEach((token) => {
    if (right.has(token)) shared += 1;
  });
  return shared / Math.max(left.size, right.size);
}

export function wardrobeDuplicateKey(item: Pick<WardrobeDetection, "category" | "subcategory" | "primaryColor" | "pattern" | "visualSignature">) {
  return normalize([
    item.category,
    item.subcategory,
    item.primaryColor,
    item.pattern,
    item.visualSignature,
  ].join(" "));
}

export function wardrobeDuplicateScore(a: Pick<WardrobeDetection, "category" | "subcategory" | "primaryColor" | "pattern" | "visualSignature">, b: Pick<WardrobeDetection, "category" | "subcategory" | "primaryColor" | "pattern" | "visualSignature">) {
  if (a.category !== b.category) return 0;
  const signature = tokenSimilarity(a.visualSignature, b.visualSignature);
  const subtype = normalize(a.subcategory) === normalize(b.subcategory) ? 1 : 0;
  const color = normalize(a.primaryColor) === normalize(b.primaryColor) ? 1 : 0;
  const pattern = normalize(a.pattern) === normalize(b.pattern) ? 1 : 0;
  return signature * 0.55 + subtype * 0.2 + color * 0.2 + pattern * 0.05;
}

export function isWardrobeCategory(value: unknown): value is WardrobeCategory {
  return WARDROBE_CATEGORIES.includes(value as WardrobeCategory);
}
