"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { signInAnonymously, type User } from "firebase/auth";
import { getLookGoFirebase } from "@/lib/firebase-client";
import {
  dedupeWardrobeDetections,
  wardrobeDuplicateKey,
  wardrobeDuplicateScore,
  type WardrobeDetection,
  type WardrobeItem,
} from "@/lib/wardrobe";

async function cloudUser(): Promise<User | null> {
  const fb = getLookGoFirebase();
  if (!fb) return null;
  if (fb.auth.currentUser) return fb.auth.currentUser;
  try {
    return (await signInAnonymously(fb.auth)).user;
  } catch {
    return null;
  }
}

export async function wardrobeAuthToken() {
  const user = await cloudUser();
  if (!user) return null;
  try {
    return { uid: user.uid, token: await user.getIdToken() };
  } catch {
    return null;
  }
}

export async function readWardrobeItems(max = 300): Promise<WardrobeItem[]> {
  const fb = getLookGoFirebase();
  const user = await cloudUser();
  if (!fb || !user) return [];
  try {
    const snap = await getDocs(
      query(
        collection(fb.db, "users", user.uid, "wardrobe"),
        orderBy("createdAt", "desc"),
        limit(max),
      ),
    );
    return snap.docs.map((entry) => ({
      id: entry.id,
      ...(entry.data() as Omit<WardrobeItem, "id">),
    }));
  } catch {
    return [];
  }
}

export async function uploadWardrobePhoto(file: Blob, scanId: string, index: number, originalName = "penderie.jpg") {
  const auth = await wardrobeAuthToken();
  if (!auth) return null;
  const form = new FormData();
  form.append("file", file, originalName);
  form.append("key", "wardrobeScan");
  form.append("uid", auth.uid);
  form.append("fileName", `${scanId}-${index}-${originalName}`);
  try {
    const response = await fetch("/api/storage/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${auth.token}` },
      body: form,
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as { path?: string };
    return response.ok && data.path ? data.path : null;
  } catch {
    return null;
  }
}

export async function saveWardrobeDetections(
  detections: WardrobeDetection[],
  sourcePhotoPaths: Record<number, string>,
): Promise<number> {
  const fb = getLookGoFirebase();
  const user = await cloudUser();
  if (!fb || !user || detections.length === 0) return 0;

  const existing = await readWardrobeItems(500);
  const scanUnique = dedupeWardrobeDetections(detections);
  const unique = scanUnique.filter(
    (candidate) => !existing.some((saved) => wardrobeDuplicateScore(candidate, saved) >= 0.82),
  );
  if (!unique.length) return 0;

  const batch = writeBatch(fb.db);
  unique.forEach((item) => {
    const ref = doc(collection(fb.db, "users", user.uid, "wardrobe"));
    batch.set(ref, {
      ...item,
      duplicateKey: wardrobeDuplicateKey(item),
      sourcePhotoPath: sourcePhotoPaths[item.sourceImageIndex] || "",
      userValidated: true,
      aiGenerated: true,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  try {
    await batch.commit();
    return unique.length;
  } catch {
    return 0;
  }
}

export async function updateWardrobeItem(id: string, patch: Partial<WardrobeDetection>) {
  const fb = getLookGoFirebase();
  const user = await cloudUser();
  if (!fb || !user || !id) return false;
  try {
    const nextPatch: Record<string, unknown> = { ...patch, updatedAt: serverTimestamp() };
    if (
      patch.category ||
      patch.subcategory ||
      patch.garmentType ||
      patch.primaryColor ||
      patch.colorFamily ||
      patch.pattern ||
      patch.visualSignature
    ) {
      const current = (await readWardrobeItems()).find((item) => item.id === id);
      if (current) nextPatch.duplicateKey = wardrobeDuplicateKey({ ...current, ...patch });
    }
    await updateDoc(doc(fb.db, "users", user.uid, "wardrobe", id), nextPatch);
    return true;
  } catch {
    return false;
  }
}

export async function deleteWardrobeItem(id: string) {
  const fb = getLookGoFirebase();
  const user = await cloudUser();
  if (!fb || !user || !id) return false;
  try {
    await deleteDoc(doc(fb.db, "users", user.uid, "wardrobe", id));
    return true;
  } catch {
    return false;
  }
}
