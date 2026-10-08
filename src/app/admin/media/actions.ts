"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { checked, fileFrom, int, str } from "@/lib/forms";
import { deleteFile, keyFromUrl, saveUpload } from "@/lib/storage";

const KINDS = ["PHOTO", "VIDEO", "AUDIO", "PRESS"];

function refresh() {
  revalidatePath("/media");
  revalidatePath("/admin/media");
}

// Add by upload (photos, short video/audio files) or by pasting a link.
export async function addMediaItem(form: FormData) {
  await requireAdmin("/admin/media");
  const kind = KINDS.includes(str(form, "kind")) ? str(form, "kind") : "PHOTO";
  const file = fileFrom(form);
  const url = file ? (await saveUpload(file)).url : str(form, "url");
  if (!url) return;
  const last = await db.mediaItem.aggregate({ _max: { sortOrder: true } });
  await db.mediaItem.create({
    data: { kind, url, title: str(form, "title"), caption: str(form, "caption"), sortOrder: (last._max.sortOrder ?? 0) + 1 },
  });
  refresh();
}

export async function updateMediaItem(form: FormData) {
  await requireAdmin("/admin/media");
  await db.mediaItem.update({
    where: { id: str(form, "id") },
    data: { title: str(form, "title"), caption: str(form, "caption"), sortOrder: int(form, "sortOrder"), published: checked(form, "published") },
  });
  refresh();
}

export async function deleteMediaItem(form: FormData) {
  await requireAdmin("/admin/media");
  const m = await db.mediaItem.delete({ where: { id: str(form, "id") } });
  const key = keyFromUrl(m.url);
  if (key) await deleteFile(key);
  refresh();
}
