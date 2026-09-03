import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveStyleProfile } from "@/lib/users";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  try {
    const body = await request.json();
    const input = {
      topSize: String(body.topSize || "").trim(),
      bottomSize: String(body.bottomSize || "").trim(),
      shoeSize: String(body.shoeSize || "").trim(),
      preferredStyles: Array.isArray(body.preferredStyles) ? body.preferredStyles.map(String) : [],
      preferredColors: Array.isArray(body.preferredColors) ? body.preferredColors.map(String) : [],
      avoidedColors: Array.isArray(body.avoidedColors) ? body.avoidedColors.map(String) : [],
      preferredBrands: Array.isArray(body.preferredBrands) ? body.preferredBrands.map(String) : [],
      avoidedBrands: String(body.avoidedBrands || "").trim(),
      outfitBudget: Number(body.outfitBudget),
      budgetTier: String(body.budgetTier || "").trim(),
    };
    if (!input.topSize || !input.bottomSize || !input.shoeSize || !input.preferredStyles.length || !input.budgetTier || !Number.isFinite(input.outfitBudget) || input.outfitBudget < 30) return NextResponse.json({ error: "Complétez votre style, vos tailles et votre budget." }, { status: 400 });
    if (!["Smart", "Équilibre", "Signature"].includes(input.budgetTier)) return NextResponse.json({ error: "Niveau de budget invalide." }, { status: 400 });
    await saveStyleProfile(session.user.id, input);
    return NextResponse.json({ ok: true, next: "/inscription/analyse" });
  } catch {
    return NextResponse.json({ error: "Impossible d’enregistrer vos préférences." }, { status: 500 });
  }
}
