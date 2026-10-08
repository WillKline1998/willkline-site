"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { str } from "@/lib/forms";
import { deleteFile, keyFromUrl } from "@/lib/storage";

export async function setSignups(form: FormData) {
  await requireAdmin("/admin/wall");
  const value = str(form, "mode") === "open" ? "open" : "closed";
  await db.siteSetting.upsert({ where: { key: "wall_signups" }, update: { value }, create: { key: "wall_signups", value } });
  revalidatePath("/admin/wall");
  revalidatePath("/wall");
  revalidatePath("/signup");
}

// Removes a member and everything they posted/saved (cascades). Never the admin.
export async function deleteMember(form: FormData) {
  await requireAdmin("/admin/wall");
  const id = str(form, "id");
  const images = await db.wallPost.findMany({ where: { authorId: id, imageUrl: { not: null } }, select: { imageUrl: true } });
  const { count } = await db.user.deleteMany({ where: { id, role: "MEMBER" } });
  if (count) for (const { imageUrl } of images) {
    const key = imageUrl && keyFromUrl(imageUrl);
    if (key) await deleteFile(key);
  }
  revalidatePath("/admin/wall");
  revalidatePath("/wall", "layout");
}
