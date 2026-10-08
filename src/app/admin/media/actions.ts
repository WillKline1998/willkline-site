"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { checked, fileFrom, int, str } from "@/lib/forms";
import { ImageError, isWebUrl, saveResizedImage } from "@/lib/images";
import { deleteFile, keyFromUrl } from "@/lib/storage";

function refresh() {
  revalidatePath("/media");
  revalidatePath("/admin/media");
}

const back = (q: Record<string, string>): never => redirect(`/admin/media?${new URLSearchParams(q)}`);

// One item per submit: an uploaded photo OR a link to a web-hosted video.
export async function addMediaItem(form: FormData) {
  await requireAdmin("/admin/media");
  const kind = str(form, "kind") === "VIDEO" ? "VIDEO" : "PHOTO";
  let url: string;
  if (kind === "PHOTO") {
    const file = fileFrom(form, "image");
    if (!file) back({ error: "Choose a photo to upload." });
    try {
      url = await saveResizedImage(file!, { maxSide: 2000 }); // big enough for the full-screen view
    } catch (e) {
      return back({ error: e instanceof ImageError ? e.message : "Couldn't save that photo." });
    }
  } else {
    url = str(form, "video");
    if (!isWebUrl(url)) back({ error: "Paste the full video link (it starts with https://)." });
  }
  const last = await db.mediaItem.aggregate({ _max: { sortOrder: true } });
  await db.mediaItem.create({ data: { kind, url, title: str(form, "title"), sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  refresh();
  back({ added: kind === "PHOTO" ? "photo" : "video" });
}

export async function updateMediaItem(form: FormData) {
  await requireAdmin("/admin/media");
  await db.mediaItem.update({
    where: { id: str(form, "id") },
    data: { title: str(form, "title"), sortOrder: int(form, "sortOrder"), published: checked(form, "published") },
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
