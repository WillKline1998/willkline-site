"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteFile, keyFromUrl, saveUpload } from "@/lib/storage";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const opt = (f: FormData, k: string) => str(f, k) || null;

function fields(f: FormData) {
  const date = str(f, "eventDate");
  return {
    kind: str(f, "kind") || "NOTE",
    title: str(f, "title"),
    body: str(f, "body"),
    eventDate: date ? new Date(date) : null,
    venue: opt(f, "venue"),
    linkHref: opt(f, "linkHref"),
    linkLabel: opt(f, "linkLabel"),
    pinned: f.get("pinned") === "on",
    published: f.get("published") === "on",
  };
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin/notices");
}

export async function createNotice(form: FormData) {
  await requireAdmin();
  const n = await db.notice.create({ data: fields(form) });
  refresh();
  redirect(`/admin/notices/${n.id}`);
}

export async function updateNotice(form: FormData) {
  await requireAdmin();
  await db.notice.update({ where: { id: str(form, "id") }, data: fields(form) });
  refresh();
}

export async function deleteNotice(form: FormData) {
  await requireAdmin();
  const n = await db.notice.delete({ where: { id: str(form, "id") }, include: { media: true } });
  for (const m of n.media) {
    const key = keyFromUrl(m.url);
    if (key) await deleteFile(key);
  }
  refresh();
  redirect("/admin/notices");
}

// Attach media: either an uploaded file (image → IMAGE, anything else → FILE)
// or a pasted URL (kind chosen in the form: EMBED / IMAGE / LINK).
export async function addMedia(form: FormData) {
  await requireAdmin();
  const noticeId = str(form, "noticeId");
  const caption = str(form, "caption");
  const file = form.get("file");
  const position = await db.noticeMedia.count({ where: { noticeId } });
  if (file instanceof File && file.size > 0) {
    const u = await saveUpload(file);
    const kind = u.mimeType.startsWith("image/") ? "IMAGE" : u.mimeType.startsWith("video/") ? "EMBED" : "FILE";
    await db.noticeMedia.create({ data: { noticeId, kind, url: u.url, caption, position } });
  } else if (str(form, "url")) {
    await db.noticeMedia.create({ data: { noticeId, kind: str(form, "urlKind") || "EMBED", url: str(form, "url"), caption, position } });
  }
  refresh();
}

export async function removeMedia(form: FormData) {
  await requireAdmin();
  const m = await db.noticeMedia.delete({ where: { id: str(form, "id") } });
  const key = keyFromUrl(m.url);
  if (key) await deleteFile(key);
  refresh();
}

export async function moveMedia(form: FormData) {
  await requireAdmin();
  const m = await db.noticeMedia.findUnique({ where: { id: str(form, "id") } });
  if (!m) return;
  const all = await db.noticeMedia.findMany({ where: { noticeId: m.noticeId }, orderBy: { position: "asc" } });
  const i = all.findIndex((x) => x.id === m.id);
  const j = i + (str(form, "dir") === "up" ? -1 : 1);
  if (j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  await db.$transaction(all.map((x, position) => db.noticeMedia.update({ where: { id: x.id }, data: { position } })));
  refresh();
}
