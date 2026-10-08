"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { currentUser, requireAdmin, requireUser } from "@/lib/auth";
import { str } from "@/lib/forms";
import { LIMITS, WALL_KINDS, kindFromUrl } from "@/lib/wall";

export type PostState = { error?: string; ok?: boolean; values?: { url: string; title: string; note: string; kind: string } };

const refresh = () => revalidatePath("/wall", "layout");

export async function createWallPost(_prev: PostState, form: FormData): Promise<PostState> {
  const user = await requireUser();
  const url = str(form, "url");
  const title = str(form, "title").slice(0, LIMITS.title);
  const note = str(form, "note").slice(0, LIMITS.note);
  const values = { url, title, note, kind: str(form, "kind") };
  const fail = (error: string): PostState => ({ error, values });
  try {
    if (!/^https?:$/.test(new URL(url).protocol)) throw new Error();
  } catch {
    return fail("Paste a full link that starts with https://");
  }
  if (!title) return fail("Give it a title (the piece, the artist, or both).");
  const today = await db.wallPost.count({ where: { authorId: user.id, createdAt: { gt: new Date(Date.now() - 864e5) } } });
  if (today >= LIMITS.postsPerDay) return fail(`That's ${LIMITS.postsPerDay} posts today. Come back tomorrow!`);
  const picked = str(form, "kind");
  const kind = picked in WALL_KINDS ? picked : kindFromUrl(url);
  await db.wallPost.create({ data: { authorId: user.id, url, title, note, kind } });
  refresh();
  return { ok: true };
}

export async function toggleSave(form: FormData) {
  const user = await requireUser();
  const wallPostId = str(form, "id");
  const key = { userId_wallPostId: { userId: user.id, wallPostId } };
  if (await db.save.findUnique({ where: key })) await db.save.delete({ where: key });
  else await db.save.create({ data: { userId: user.id, wallPostId } });
  refresh();
}

// Authors delete their own posts; the admin can delete anything.
export async function deleteWallPost(form: FormData) {
  const user = await requireUser();
  const post = await db.wallPost.findUnique({ where: { id: str(form, "id") } });
  if (!post || (post.authorId !== user.id && user.role !== "ADMIN")) return;
  await db.wallPost.delete({ where: { id: post.id } });
  refresh();
}

// Reports from three different people hide a post until the admin reviews it.
export async function reportWallPost(form: FormData) {
  const user = await currentUser();
  if (!user) return;
  const wallPostId = str(form, "id");
  await db.wallReport.upsert({
    where: { userId_wallPostId: { userId: user.id, wallPostId } },
    update: {},
    create: { userId: user.id, wallPostId },
  });
  const reports = await db.wallReport.count({ where: { wallPostId } });
  await db.wallPost.update({ where: { id: wallPostId }, data: { reports, ...(reports >= 3 ? { hidden: true } : {}) } });
  refresh();
}

export async function setHidden(form: FormData) {
  await requireAdmin("/admin/wall");
  const id = str(form, "id");
  const hidden = form.get("hidden") === "1";
  // Unhiding = the admin reviewed it: clear reports so it isn't re-hidden immediately.
  if (!hidden) await db.wallReport.deleteMany({ where: { wallPostId: id } });
  await db.wallPost.update({ where: { id }, data: { hidden, ...(hidden ? {} : { reports: 0 }) } });
  refresh();
  revalidatePath("/admin/wall");
}
