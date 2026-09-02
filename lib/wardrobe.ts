export const WARDROBE_CATEGORIES = [
  "tops",
  "bottoms",
  "dresses",
  "jumpsuits",
  "sets",
  "outerwear",
  "knitwear",
  "activewear",
  "swimwear",
  "underwear",
  "sleepwear",
  "shoes",
  "bags",
  "headwear",
  "jewelry",
  "hosiery",
  "accessories",
  "other",
] as const;

export type WardrobeCategory = (typeof WARDROBE_CATEGORIES)[number];

export const WARDROBE_CATEGORY_LABELS: Record<WardrobeCategory, string> = {
  tops: "Hauts",
  bottoms: "Bas",
  dresses: "Robes",
  jumpsuits: "Combinaisons",
  sets: "Ensembles",
  outerwear: "Vestes & manteaux",
  knitwear: "Maille",
  activewear: "Sport",
  swimwear: "Maillots de bain",
  underwear: "Lingerie & sous-vêtements",
  sleepwear: "Nuit & homewear",
  shoes: "Chaussures",
  bags: "Sacs",
  headwear: "Chapeaux & couvre-chefs",
  jewelry: "Bijoux",
  hosiery: "Collants & chaussettes",
  accessories: "Accessoires",
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
  colorFamily: string;
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

export function canonicalColorFamily(value: string) {
  const v = normalize(value);
  const aliases: Array<[string, string[]]> = [
    ["noir", ["noir", "black", "anthracite tres fonce"]],
    ["blanc", ["blanc", "white", "ivoire", "ecru", "creme"]],
    ["gris", ["gris", "grey", "gray", "anthracite"]],
    ["beige", ["beige", "taupe", "sable", "camel clair"]],
    ["marron", ["marron", "brun", "chocolat", "camel", "cognac", "terracotta"]],
    ["bleu", ["bleu", "marine", "navy", "indigo", "denim", "cyan", "turquoise"]],
    ["vert", ["vert", "kaki", "olive", "emeraude", "menthe", "sapin"]],
    ["rouge", ["rouge", "bordeaux", "grenat", "carmin", "framboise"]],
    ["rose", ["rose", "fuchsia", "magenta", "poudre"]],
    ["violet", ["violet", "mauve", "lilas", "prune"]],
    ["orange", ["orange", "corail", "abricot", "saumon"]],
    ["jaune", ["jaune", "moutarde", "citron", "ocre"]],
    ["dore", ["dore", "gold", "or"]],
    ["argente", ["argente", "silver", "argent"]],
    ["multicolore", ["multicolore", "multicolor", "arc en ciel"]],
  ];
  for (const [family, words] of aliases) {
    if (words.some((word) => v.includes(normalize(word)))) return family;
  }
  return v || "non precisee";
}

export function wardrobeDuplicateKey(item: Pick<WardrobeDetection, "category" | "subcategory" | "garmentType" | "primaryColor" | "colorFamily" | "pattern" | "visualSignature">) {
  return normalize([
    item.category,
    item.subcategory,
    item.garmentType,
    item.colorFamily || canonicalColorFamily(item.primaryColor),
    item.primaryColor,
    item.pattern,
    item.visualSignature,
  ].join(" "));
}

export function wardrobeDuplicateScore(
  a: Pick<WardrobeDetection, "category" | "subcategory" | "garmentType" | "primaryColor" | "colorFamily" | "pattern" | "visualSignature">,
  b: Pick<WardrobeDetection, "category" | "subcategory" | "garmentType" | "primaryColor" | "colorFamily" | "pattern" | "visualSignature">,
) {
  if (a.category !== b.category) return 0;
  const signature = tokenSimilarity(a.visualSignature, b.visualSignature);
  const typeSimilarity = tokenSimilarity(`${a.subcategory} ${a.garmentType}`, `${b.subcategory} ${b.garmentType}`);
  const exactType = normalize(a.garmentType) === normalize(b.garmentType) || normalize(a.subcategory) === normalize(b.subcategory) ? 1 : 0;
  const colorFamilyA = canonicalColorFamily(a.colorFamily || a.primaryColor);
  const colorFamilyB = canonicalColorFamily(b.colorFamily || b.primaryColor);
  const colorFamily = colorFamilyA === colorFamilyB ? 1 : 0;
  const exactColor = normalize(a.primaryColor) === normalize(b.primaryColor) ? 1 : 0;
  const pattern = normalize(a.pattern) === normalize(b.pattern) ? 1 : 0;
  return Math.min(1, signature * 0.46 + typeSimilarity * 0.19 + exactType * 0.1 + colorFamily * 0.13 + exactColor * 0.07 + pattern * 0.05);
}

export function dedupeWardrobeDetections(items: WardrobeDetection[], threshold = 0.82) {
  const sorted = [...items].sort((a, b) => b.confidence - a.confidence);
  const unique: WardrobeDetection[] = [];
  for (const item of sorted) {
    const duplicate = unique.some((saved) => wardrobeDuplicateScore(item, saved) >= threshold);
    if (!duplicate) unique.push(item);
  }
  return unique.sort((a, b) => a.sourceImageIndex - b.sourceImageIndex || a.tempId.localeCompare(b.tempId));
}

export function isWardrobeCategory(value: unknown): value is WardrobeCategory {
  return WARDROBE_CATEGORIES.includes(value as WardrobeCategory);
}
