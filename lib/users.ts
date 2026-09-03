import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";

const COLLECTION = "appUsers";

export type DbUser = { id: string; email: string; password_hash: string | null; name: string | null; image: string | null; provider: string };
export type IdentityProfileInput = { pseudo: string; heightCm: number; weightKg: number; age: number; hairColor: string; portraitPath: string; fullBodyPath: string };
export type StyleProfileInput = { topSize: string; bottomSize: string; shoeSize: string; preferredStyles: string[]; preferredColors: string[]; avoidedColors: string[]; preferredBrands: string[]; avoidedBrands: string; outfitBudget: number; budgetTier: string };

function docId(email: string) {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email: string): Promise<DbUser | undefined> {
  const snap = await getAdminFirestore().collection(COLLECTION).doc(docId(email)).get();
  if (!snap.exists) return undefined;
  const data = snap.data() as Record<string, unknown>;
  return {
    id: snap.id,
    email: String(data.email || snap.id),
    password_hash: (data.passwordHash as string) || null,
    name: (data.name as string) || null,
    image: (data.image as string) || null,
    provider: String(data.provider || "credentials"),
  };
}

export async function createEmailUser(email: string, passwordHash: string, name?: string): Promise<string> {
  const id = docId(email);
  await getAdminFirestore().collection(COLLECTION).doc(id).set({
    email: id,
    passwordHash,
    name: name || null,
    image: null,
    provider: "credentials",
    profile: { onboardingStep: 1, onboardingComplete: false },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return id;
}

export async function upsertOAuthUser(email: string, name?: string | null, image?: string | null): Promise<string> {
  const id = docId(email);
  const ref = getAdminFirestore().collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (snap.exists) {
    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (name) update.name = name;
    if (image) update.image = image;
    await ref.update(update);
  } else {
    await ref.set({
      email: id,
      passwordHash: null,
      name: name || null,
      image: image || null,
      provider: "google",
      profile: { onboardingStep: 1, onboardingComplete: false },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  return id;
}

export async function saveIdentityProfile(userId: string, input: IdentityProfileInput) {
  await getAdminFirestore().collection(COLLECTION).doc(userId).set(
    {
      profile: {
        pseudo: input.pseudo,
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        age: input.age,
        hairColor: input.hairColor,
        portraitPath: input.portraitPath,
        fullBodyPath: input.fullBodyPath,
        onboardingStep: 2,
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function saveStyleProfile(userId: string, input: StyleProfileInput) {
  await getAdminFirestore().collection(COLLECTION).doc(userId).set(
    {
      profile: {
        topSize: input.topSize,
        bottomSize: input.bottomSize,
        shoeSize: input.shoeSize,
        preferredStyles: input.preferredStyles,
        preferredColors: input.preferredColors,
        avoidedColors: input.avoidedColors,
        preferredBrands: input.preferredBrands,
        avoidedBrands: input.avoidedBrands,
        outfitBudget: input.outfitBudget,
        budgetTier: input.budgetTier,
        onboardingStep: 3,
        onboardingComplete: true,
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
