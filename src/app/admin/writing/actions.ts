"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { checked, slugify, str, uniqueSlug } from "@/lib/forms";
import { deleteLeadMedia, resolveLeadMedia } from "@/lib/lead-media";

const slugTaken = (id?: string) => async (slug: string) => Boolean(await db.post.findFirst({ where: { slug, NOT: { id } } }));

function refresh(slug?: string) {
  revalidatePath("/writing");
  if (slug) revalidatePath(`/writing/${slug}`);
  revalidatePath("/admin/writing");
}

export async function createPost(form: FormData) {
  await requireAdmin("/admin/writing");
  const title = str(form, "title");
  if (!title) redirect("/admin/writing");
  const post = await db.post.create({ data: { title, slug: await uniqueSlug(title, slugTaken()), body: "" } });
  redirect(`/admin/writing/${post.id}`);
}

export async function savePost(form: FormData) {
  await requireAdmin("/admin/writing");
  const id = str(form, "id");
  const old = await db.post.findUniqueOrThrow({ where: { id } });
  const back = (q: Record<string, string>): never => redirect(`/admin/writing/${id}?${new URLSearchParams(q)}`);

  const title = str(form, "title");
  if (!title) back({ error: "A title is required." });
  const lead = await resolveLeadMedia(form, old);
  if ("error" in lead) return back({ error: lead.error });

  const wanted = str(form, "slug") || title;
  const slug = slugify(wanted) === old.slug ? old.slug : await uniqueSlug(wanted, slugTaken(id));
  const published = checked(form, "published");
  await db.post.update({
    where: { id },
    data: {
      title,
      slug,
      body: String(form.get("body") ?? "").replace(/\r\n/g, "\n"),
      ...lead,
      published,
      // Posting time: stamped the first time it's published (kept if unpublished later).
      publishedAt: published && !old.publishedAt ? new Date() : old.publishedAt,
    },
  });
  refresh(slug);
  back({ saved: "1" });
}

export async function deletePost(form: FormData) {
  await requireAdmin("/admin/writing");
  const post = await db.post.delete({ where: { id: str(form, "id") } });
  await deleteLeadMedia(post);
  refresh();
  redirect("/admin/writing");
}
