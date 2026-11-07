"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fileFrom } from "@/lib/forms";
import { ImageError, saveResizedImage } from "@/lib/images";
import { getSetting } from "@/lib/settings";
import { deleteFile, keyFromUrl } from "@/lib/storage";

export type SaveState = { ok?: boolean; error?: string };

async function put(key: string, value: string) {
  await db.siteSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function saveBio(
  _prev: SaveState,
  form: FormData,
): Promise<SaveState> {
  await requireAdmin("/admin/bio");
  await put(
    "bio",
    String(form.get("bio") ?? "")
      .replace(/\r\n/g, "\n")
      .trim(),
  );
  revalidatePath("/bio");
  return { ok: true };
}

async function dropOldPhoto(setting: string) {
  const old = await getSetting(setting);
  const key = old && keyFromUrl(old);
  if (key) await deleteFile(key);
}

// One admin photo slot stored as SiteSetting `<setting>` (URL) + `<setting>_alt`: replace it, change its
// description, or take it off. Used by the Bio photo and the homepage photo.
async function savePhotoSlot(
  form: FormData,
  setting: string,
  page: string,
  admin: string,
): Promise<SaveState> {
  await requireAdmin(admin);
  const image = fileFrom(form, "image");
  await put(
    `${setting}_alt`,
    String(form.get("alt") ?? "")
      .trim()
      .slice(0, 200),
  );
  if (form.get("remove") === "on" && !image) {
    await dropOldPhoto(setting);
    await put(setting, "");
  } else if (image) {
    try {
      const url = await saveResizedImage(image, { maxSide: 1600 });
      await dropOldPhoto(setting);
      await put(setting, url);
    } catch (e) {
      return {
        error:
          e instanceof ImageError ? e.message : "Couldn't save that photo.",
      };
    }
  }
  revalidatePath(page);
  revalidatePath(admin);
  return { ok: true };
}

// The picture at the head of the Bio page.
export async function saveBioPhoto(
  _prev: SaveState,
  form: FormData,
): Promise<SaveState> {
  return savePhotoSlot(form, "bio_photo", "/bio", "/admin/bio");
}

// The picture above the first bulletin post on the homepage.
export async function saveHomePhoto(
  _prev: SaveState,
  form: FormData,
): Promise<SaveState> {
  return savePhotoSlot(form, "home_photo", "/", "/admin/home");
}

// CV is structured JSON; validate the shape before saving so a typo can't break /cv.
export async function saveCv(
  _prev: SaveState,
  form: FormData,
): Promise<SaveState> {
  await requireAdmin("/admin/cv");
  const raw = String(form.get("cv") ?? "");
  try {
    const cv = JSON.parse(raw);
    for (const k of [
      "name",
      "summary",
      "contact",
      "experience",
      "music",
      "education",
      "skills",
    ]) {
      if (!(k in cv)) return { error: `Missing "${k}".` };
    }
    if (
      !Array.isArray(cv.experience) ||
      !Array.isArray(cv.music) ||
      !Array.isArray(cv.education) ||
      !Array.isArray(cv.skills)
    )
      return {
        error:
          "experience, music, education, and skills must be lists ([ … ]).",
      };
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
