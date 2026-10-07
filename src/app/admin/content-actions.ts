"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export type SaveState = { ok?: boolean; error?: string };

async function put(key: string, value: string) {
  await db.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

export async function saveBio(_prev: SaveState, form: FormData): Promise<SaveState> {
  await requireAdmin("/admin/bio");
  await put("bio", String(form.get("bio") ?? "").replace(/\r\n/g, "\n").trim());
  revalidatePath("/bio");
  return { ok: true };
}

// CV is structured JSON; validate the shape before saving so a typo can't break /cv.
export async function saveCv(_prev: SaveState, form: FormData): Promise<SaveState> {
  await requireAdmin("/admin/cv");
  const raw = String(form.get("cv") ?? "");
  try {
    const cv = JSON.parse(raw);
    for (const k of ["name", "summary", "contact", "experience", "music", "education", "skills"]) {
      if (!(k in cv)) return { error: `Missing "${k}".` };
    }
    if (!Array.isArray(cv.experience) || !Array.isArray(cv.music) || !Array.isArray(cv.education) || !Array.isArray(cv.skills))
      return { error: "experience, music, education, and skills must be lists ([ … ])." };
    await put("cv", JSON.stringify(cv, null, 2));
  } catch (e) {
    return { error: `That isn't valid JSON yet: ${(e as Error).message}` };
  }
  revalidatePath("/cv");
  return { ok: true };
}

export async function saveAlbum(form: FormData) {
  await requireAdmin("/admin/music");
  const s = (k: string) => String(form.get(k) ?? "").trim();
  const year = parseInt(s("year"), 10);
  await db.album.update({
    where: { id: s("id") },
    data: {
      description: s("description"),
      year: Number.isFinite(year) ? year : null,
      sortOrder: parseInt(s("sortOrder"), 10) || 0,
      published: form.get("published") === "on",
    },
  });
  revalidatePath("/music");
  revalidatePath(`/music/${s("slug")}`);
  revalidatePath("/admin/music");
}
