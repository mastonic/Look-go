export type WardrobeItem = {
  id: string;
  name: string;
  category: string;
  color: string;
  confidence: number;
};

export type GeneratedLook = {
  title: string;
  occasion: string;
  score: number;
  colors: string;
  items: string[];
  missing?: string;
};

export const detectedWardrobe: WardrobeItem[] = [
  { id: "blazer-noir", name: "Blazer noir", category: "Veste", color: "Noir", confidence: 98 },
  { id: "jean-droit", name: "Jean droit bleu", category: "Bas", color: "Bleu", confidence: 96 },
  { id: "chemise-blanche", name: "Chemise blanche", category: "Haut", color: "Blanc", confidence: 94 },
  { id: "robe-noire", name: "Robe noire", category: "Robe", color: "Noir", confidence: 97 },
  { id: "sac-beige", name: "Sac beige", category: "Accessoire", color: "Beige", confidence: 91 },
];

export const generatedLooks: GeneratedLook[] = [
  {
    title: "Réunion à 10h",
    occasion: "Travail",
    score: 94,
    colors: "Noir · Blanc · Beige",
    items: ["Blazer noir", "Chemise blanche", "Jean droit bleu", "Sac beige"],
  },
  {
    title: "Déjeuner en ville",
    occasion: "Casual chic",
    score: 91,
    colors: "Bleu · Blanc · Beige",
    items: ["Chemise blanche", "Jean droit bleu", "Sac beige"],
    missing: "Mocassins cognac",
  },
  {
    title: "Dîner vendredi",
    occasion: "Soirée",
    score: 96,
    colors: "Noir · Champagne",
    items: ["Robe noire", "Sac beige"],
    missing: "Boucles dorées fines",
  },
];

export const pricingPlans = [
  {
    name: "Scan Découverte",
    price: "0 €",
    subtitle: "Comprendre son dressing",
    features: ["1 scan dressing", "5 vêtements validés", "1 look test", "Diagnostic style basique"],
  },
  {
    name: "Pack Looks",
    price: "9,99 €",
    subtitle: "Pour une occasion précise",
    features: ["3 looks personnalisés", "Vos vêtements en priorité", "Occasion au choix", "Recommandations couleurs"],
  },
  {
    name: "Premium",
    price: "9,99 €/mois",
    subtitle: "Votre dressing au quotidien",
    featured: true,
    features: ["Dressing illimité", "Looks hebdomadaires", "Cost-per-wear", "Alertes pièces manquantes", "Favoris"],
  },
  {
    name: "VIP Try-On",
    price: "24,99 €/mois",
    subtitle: "Décider avec plus de confiance",
    features: ["Try-On IA premium", "Looks selon quotas équitables", "Défilé privé expérimental", "Conseiller IA prioritaire", "Alertes shopping avancées"],
  },
];
