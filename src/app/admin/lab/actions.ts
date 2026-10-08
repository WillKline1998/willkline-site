"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { checked, int, optional, slugify, str, uniqueSlug } from "@/lib/forms";

const STATUSES = ["IDEA", "BUILDING", "LIVE"];
const slugTaken = (id?: string) => async (slug: string) => Boolean(await db.labProject.findFirst({ where: { slug, NOT: { id } } }));

function refresh(slug?: string) {
  revalidatePath("/lab");
  if (slug) revalidatePath(`/lab/${slug}`);
  revalidatePath("/admin/lab");
}

export async function createProject(form: FormData) {
  await requireAdmin("/admin/lab");
  const title = str(form, "title") || "Untitled";
  const last = await db.labProject.aggregate({ _max: { sortOrder: true } });
  const p = await db.labProject.create({
    data: { title, slug: await uniqueSlug(title, slugTaken()), published: false, sortOrder: (last._max.sortOrder ?? 0) + 1 },
  });
  redirect(`/admin/lab/${p.id}`);
}

export async function saveProject(form: FormData) {
  await requireAdmin("/admin/lab");
  const id = str(form, "id");
  const old = await db.labProject.findUniqueOrThrow({ where: { id } });
  const wanted = str(form, "slug") || str(form, "title");
  const slug = slugify(wanted) === old.slug ? old.slug : await uniqueSlug(wanted, slugTaken(id));
  await db.labProject.update({
    where: { id },
    data: {
      title: str(form, "title") || "Untitled",
      slug,
      description: str(form, "description"),
      body: String(form.get("body") ?? "").replace(/\r\n/g, "\n"),
      status: STATUSES.includes(str(form, "status")) ? str(form, "status") : "IDEA",
      tech: str(form, "tech"),
      url: optional(form, "url"),
      repoUrl: optional(form, "repoUrl"),
      sortOrder: int(form, "sortOrder"),
      published: checked(form, "published"),
    },
  });
  refresh(slug);
}

export async function deleteProject(form: FormData) {
  await requireAdmin("/admin/lab");
  await db.labProject.delete({ where: { id: str(form, "id") } });
  refresh();
  redirect("/admin/lab");
}
