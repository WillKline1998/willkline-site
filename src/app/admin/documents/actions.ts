"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { deleteFile, saveFile } from "@/lib/storage";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function store(file: File) {
  const key = await saveFile(Buffer.from(await file.arrayBuffer()), file.name);
  return { fileKey: key, fileName: file.name, mimeType: file.type || "application/octet-stream", size: file.size };
}

function done() {
  revalidatePath("/cv");
  revalidatePath("/admin/documents");
}

// New document: title + file required, description optional.
export async function createDocument(form: FormData) {
  requireAdmin();
  const file = form.get("file");
  const title = str(form, "title");
  if (!(file instanceof File) || file.size === 0 || !title) return;
  const max = await db.document.aggregate({ _max: { sortOrder: true } });
  await db.document.create({
    data: { title, description: str(form, "description"), sortOrder: (max._max.sortOrder ?? 0) + 1, ...(await store(file)) },
  });
  done();
}

// Swap in a new draft. Same entry, same place on the page; the old file is removed.
export async function replaceFile(form: FormData) {
  requireAdmin();
  const id = str(form, "id");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  const old = await db.document.findUnique({ where: { id } });
  if (!old) return;
  await db.document.update({ where: { id }, data: await store(file) });
  await deleteFile(old.fileKey);
  done();
}

export async function updateDetails(form: FormData) {
  requireAdmin();
  await db.document.update({
    where: { id: str(form, "id") },
    data: {
      title: str(form, "title"),
      description: str(form, "description"),
      sortOrder: Number(str(form, "sortOrder")) || 0,
      published: form.get("published") === "on",
    },
  });
  done();
}

export async function deleteDocument(form: FormData) {
  requireAdmin();
  const doc = await db.document.delete({ where: { id: str(form, "id") } });
  await deleteFile(doc.fileKey);
  done();
}
