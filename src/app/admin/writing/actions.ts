"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { checked, fileFrom, slugify, str, uniqueSlug } from "@/lib/forms";
import { saveUpload } from "@/lib/storage";

const slugTaken = (id?: string) => async (slug: string) => Boolean(await db.post.findFirst({ where: { slug, NOT: { id } } }));

function refresh(slug?: string) {
  revalidatePath("/writing");
  if (slug) revalidatePath(`/writing/${slug}`);
  revalidatePath("/admin/writing");
}

export async function createPost(form: FormData) {
  await requireAdmin("/admin/writing");
  const title = str(form, "title") || "Untitled";
  const post = await db.post.create({ data: { title, slug: await uniqueSlug(title, slugTaken()), body: "" } });
  redirect(`/admin/writing/${post.id}`);
}

export async function savePost(form: FormData) {
  await requireAdmin("/admin/writing");
  const id = str(form, "id");
  const old = await db.post.findUniqueOrThrow({ where: { id } });
  const published = checked(form, "published");
  const slug = slugify(str(form, "slug") || str(form, "title")) === old.slug ? old.slug : await uniqueSlug(str(form, "slug") || str(form, "title"), slugTaken(id));
  await db.post.update({
    where: { id },
    data: {
      title: str(form, "title") || "Untitled",
      slug,
      summary: str(form, "summary"),
      body: String(form.get("body") ?? "").replace(/\r\n/g, "\n"),
      published,
      // First publish stamps the date; unpublishing keeps it for next time.
      publishedAt: published && !old.publishedAt ? new Date() : old.publishedAt,
    },
  });
  refresh(slug);
  if (slug !== old.slug) redirect(`/admin/writing/${id}`);
}

// Upload an image and append it to the post body as Markdown.
export async function addPostImage(form: FormData) {
  await requireAdmin("/admin/writing");
  const file = fileFrom(form);
  if (!file) return;
  const id = str(form, "id");
  const u = await saveUpload(file);
  const post = await db.post.findUniqueOrThrow({ where: { id } });
  const alt = str(form, "caption").replace(/[\[\]]/g, "");
  await db.post.update({ where: { id }, data: { body: `${post.body.trimEnd()}\n\n![${alt}](${u.url})\n` } });
  refresh(post.slug);
}

export async function deletePost(form: FormData) {
  await requireAdmin("/admin/writing");
  await db.post.delete({ where: { id: str(form, "id") } });
  refresh();
  redirect("/admin/writing");
}
