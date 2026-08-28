import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createEmailUser, findUserByEmail } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string; name?: string } | null;
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const name = String(body?.name || "").trim();

  if (!email || !email.includes("@")) return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères" }, { status: 400 });
  if (findUserByEmail(email)) return NextResponse.json({ error: "Un compte existe déjà avec cet email" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = createEmailUser(email, passwordHash, name || undefined);
  return NextResponse.json({ ok: true, userId }, { status: 201 });
}
