"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser, requireAdmin, requireUser } from "@/lib/auth";
import { fileFrom, str } from "@/lib/forms";
import { ImageError, saveResizedImage } from "@/lib/images";
import { deleteFile, keyFromUrl } from "@/lib/storage";
import { LIMITS, WALL_KINDS, kindFromUrl } from "@/lib/wall";
import { notifyAdmins } from "@/lib/notify";
import { parse } from "@/lib/validation";
import { z } from "zod";

type Values = { url: string; title: string; note: string; kind: string };
export type PostState = { error?: string; ok?: boolean; values?: Values };

const refresh = () => revalidatePath("/wall", "layout");

async function removeImage(url: string | null) {
  const key = url && keyFromUrl(url);
  if (key) await deleteFile(key);
}

const PostForm = z.object({
  url: z.url({ protocol: /^https?$/, error: "Paste a full link that starts with https://" }),
  title: z.string().min(1, "Give it a title (the piece, the artist, or both).").transform((s) => s.slice(0, LIMITS.title)),
  note: z.string().transform((s) => s.slice(0, LIMITS.note)),
  kind: z.string(),
});

/** Shared validation for create + edit. Returns clean fields or an error. */
function readPost(form: FormData): { values: Values; error?: string } {
  const values = {
    url: str(form, "url"),
    title: str(form, "title").slice(0, LIMITS.title),
    note: str(form, "note").slice(0, LIMITS.note),
    kind: str(form, "kind"),
  };
  const parsed = parse(PostForm, values);
  return parsed.error !== undefined ? { values, error: parsed.error } : { values: parsed.data };
}

const kindOf = (v: Values) => (v.kind in WALL_KINDS ? v.kind : kindFromUrl(v.url));

export async function createWallPost(_prev: PostState, form: FormData): Promise<PostState> {
  const user = await requireUser();
  const { values, error } = readPost(form);
  if (error) return { error, values };
  const today = await db.wallPost.count({ where: { authorId: user.id, createdAt: { gt: new Date(Date.now() - 864e5) } } });
  if (today >= LIMITS.postsPerDay) return { error: `That's ${LIMITS.postsPerDay} posts today. Come back tomorrow!`, values };

  let imageUrl: string | null = null;
  const image = fileFrom(form, "image");
  try {
    if (image) imageUrl = await saveResizedImage(image);
  } catch (e) {
    return { error: e instanceof ImageError ? e.message : "Couldn't save that image.", values };
  }
  await db.wallPost.create({
    data: { authorId: user.id, url: values.url, title: values.title, note: values.note, kind: kindOf(values), imageUrl },
  });
  refresh();
  return { ok: true };
}

// Authors edit their own posts; the admin can edit anything.
export async function updateWallPost(_prev: PostState, form: FormData): Promise<PostState> {
  const user = await requireUser();
  const post = await db.wallPost.findUnique({ where: { id: str(form, "id") } });
  if (!post || (post.authorId !== user.id && user.role !== "ADMIN")) return { error: "You can only edit your own posts." };
  const { values, error } = readPost(form);
  if (error) return { error, values };

  let imageUrl = post.imageUrl;
  const image = fileFrom(form, "image");
  try {
    if (image) imageUrl = await saveResizedImage(image);
  } catch (e) {
    return { error: e instanceof ImageError ? e.message : "Couldn't save that image.", values };
  }
  if (image || form.get("removeImage") === "on") {
    await removeImage(post.imageUrl);
    if (!image) imageUrl = null;
  }
  await db.wallPost.update({
    where: { id: post.id },
    data: { url: values.url, title: values.title, note: values.note, kind: kindOf(values), imageUrl },
  });
  refresh();
  redirect("/wall");
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
  await removeImage(post.imageUrl);
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
  const post = await db.wallPost.update({
    where: { id: wallPostId },
    data: { reports, ...(reports >= 3 ? { hidden: true } : {}) },
    include: { author: { select: { handle: true } } },
  });
  await notifyAdmins(reports >= 3 ? `Post hidden after ${reports} reports` : "A Wall post was reported", [
    `“${post.title}” by @${post.author.handle} has ${reports} report${reports === 1 ? "" : "s"}${reports >= 3 ? " and is now hidden" : ""}.`,
    `Reported by @${user.handle ?? user.email}.`,
    `Link: ${post.url}`,
  ]);
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
