import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveIdentityProfile } from "@/lib/users";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  try {
    const body = await request.json();
    const pseudo = String(body.pseudo || "").trim();
    const heightCm = Number(body.heightCm);
    const weightKg = Number(body.weightKg);
    const age = Number(body.age);
    const hairColor = String(body.hairColor || "").trim();
    const portraitPath = String(body.portraitPath || "").trim();
    const fullBodyPath = String(body.fullBodyPath || "").trim();
    if (!pseudo || !hairColor || !portraitPath || !fullBodyPath || !Number.isFinite(heightCm) || !Number.isFinite(weightKg) || !Number.isFinite(age)) return NextResponse.json({ error: "Tous les champs obligatoires doivent être remplis." }, { status: 400 });
    if (heightCm < 120 || heightCm > 230 || weightKg < 30 || weightKg > 300 || age < 18 || age > 120) return NextResponse.json({ error: "Valeurs de profil invalides." }, { status: 400 });
    await saveIdentityProfile(session.user.id, { pseudo, heightCm, weightKg, age, hairColor, portraitPath, fullBodyPath });
    return NextResponse.json({ ok: true, next: "/inscription/style" });
  } catch {
    return NextResponse.json({ error: "Impossible d’enregistrer le profil." }, { status: 500 });
  }
}
