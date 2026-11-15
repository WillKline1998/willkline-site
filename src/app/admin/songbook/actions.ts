"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PDFDocument } from "pdf-lib";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { str, uniqueSlug } from "@/lib/forms";
import { SONG_LIMITS, flatten, prettyTitle, splitArtist, wouldCycle } from "@/lib/songbook";
import { deleteFile, saveFile } from "@/lib/storage";

export type UploadResult = { ok: boolean; title?: string; artist?: string; pages?: number; error?: string };

/** What the song editor gets back: the values as saved (so the form shows the truth), or a plain-words error. */
export type SaveResult =
  | { ok: true; song: { title: string; artist: string; notes: string; folderId: string | null; published: boolean }; folderLabel: string; moved: boolean }
  | { ok: false; error: string };

const refresh = () => {
  revalidatePath("/songbook");
  revalidatePath("/admin/songbook");
};

const folderIdOf = async (form: FormData) => {
  const id = str(form, "folderId");
  return id && (await db.songFolder.findUnique({ where: { id }, select: { id: true } })) ? id : null;
};

/** Read a PDF's page count; null if it isn't a PDF we can open. */
async function readPdf(file: File): Promise<{ bytes: Buffer; pages: number } | string> {
  if (file.size === 0) return "That file is empty.";
  if (file.size > SONG_LIMITS.bytes) return `That PDF is over ${SONG_LIMITS.bytes / 1024 / 1024} MB. Save it smaller (or "Reduce file size" in Preview) and try again.`;
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") return "That isn't a PDF. Export it as a PDF first.";
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    return { bytes, pages: Math.max(1, doc.getPageCount()) };
  } catch {
    return "That PDF looks damaged: it wouldn't open. Re-export it and try again.";
  }
}

// One PDF per call. The upload form sends files one at a time, so a big batch never hits the 4.5 MB request limit.
export async function uploadSong(form: FormData): Promise<UploadResult> {
  await requireAdmin("/admin/songbook");
  const file = form.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file." };
  const pdf = await readPdf(file);
  if (typeof pdf === "string") return { ok: false, title: file.name, error: pdf };
  // The file name fills in the title; "Artist - Title.pdf" also fills in the artist (unless the uploader turned that off).
  const guess = form.get("split") === "off" ? { title: prettyTitle(file.name), artist: "" } : splitArtist(file.name);
  const title = (str(form, "title") || guess.title).slice(0, SONG_LIMITS.title);
  const artist = (str(form, "artist") || guess.artist).slice(0, SONG_LIMITS.artist);
  const key = await saveFile(pdf.bytes, file.name, "application/pdf");
  const slug = await uniqueSlug(title, async (s) => !!(await db.song.findUnique({ where: { slug: s }, select: { id: true } })));
  await db.song.create({
    data: { slug, title, artist, fileKey: key, fileName: file.name, size: pdf.bytes.length, pages: pdf.pages, folderId: await folderIdOf(form) },
  });
  refresh();
  return { ok: true, title, artist, pages: pdf.pages };
}

// Called from the song editor (a client component), so it returns a result instead of redirecting. It does NOT
// revalidate /admin/songbook: that would re-render the list under the editor (and, in a folder view, make a song
// that was just moved vanish before its "Saved" note could be read). The editor refreshes the page itself.
export async function updateSong(form: FormData): Promise<SaveResult> {
  await requireAdmin("/admin/songbook");
  const id = str(form, "id");
  const before = await db.song.findUnique({ where: { id }, select: { folderId: true } });
  if (!before) return { ok: false, error: "That song isn't there any more. Reload the page." };
  const wanted = str(form, "folderId");
  const folders = await db.songFolder.findMany({ select: { id: true, name: true, parentId: true } });
  if (wanted && !folders.some((f) => f.id === wanted)) return { ok: false, error: "That folder was deleted. Reload the page and pick another." };
  const title = str(form, "title").slice(0, SONG_LIMITS.title);
  if (!title) return { ok: false, error: "A song needs a title." };
  try {
    const song = await db.song.update({
      where: { id },
      data: {
        title,
        artist: str(form, "artist").slice(0, SONG_LIMITS.artist),
        notes: str(form, "notes").slice(0, SONG_LIMITS.notes),
        folderId: wanted || null,
        published: form.get("published") === "on",
      },
      select: { title: true, artist: true, notes: true, folderId: true, published: true },
    });
    revalidatePath("/songbook");
    const folderLabel = song.folderId ? (flatten(folders).find((o) => o.id === song.folderId)?.label ?? "a folder") : "No folder";
    return { ok: true, song, folderLabel, moved: before.folderId !== song.folderId };
  } catch {
    return { ok: false, error: "Couldn't save. Check your connection and try again." };
  }
}

// A newer version of the same arrangement: same page on the site, new PDF, old file removed.
export async function replaceSongFile(form: FormData): Promise<void> {
  await requireAdmin("/admin/songbook");
  const song = await db.song.findUnique({ where: { id: str(form, "id") } });
  const file = form.get("file");
  const fail = (msg: string) => redirect(`/admin/songbook?error=${encodeURIComponent(msg)}`);
  if (!song || !(file instanceof File)) return fail("Choose a PDF to replace it with.");
  const pdf = await readPdf(file);
  if (typeof pdf === "string") return fail(pdf);
  const key = await saveFile(pdf.bytes, file.name, "application/pdf");
  await db.song.update({ where: { id: song.id }, data: { fileKey: key, fileName: file.name, size: pdf.bytes.length, pages: pdf.pages } });
  await deleteFile(song.fileKey);
  refresh();
}

export async function deleteSong(form: FormData) {
  await requireAdmin("/admin/songbook");
  const song = await db.song.delete({ where: { id: str(form, "id") } });
  await deleteFile(song.fileKey);
  refresh();
}

export async function createFolder(form: FormData) {
  await requireAdmin("/admin/songbook");
  const name = str(form, "name").slice(0, SONG_LIMITS.name);
  if (!name) return;
  const parent = str(form, "parentId");
  await db.songFolder.create({ data: { name, parentId: parent && (await db.songFolder.findUnique({ where: { id: parent } })) ? parent : null } });
  refresh();
}

export async function updateFolder(form: FormData) {
  await requireAdmin("/admin/songbook");
  const id = str(form, "id");
  const name = str(form, "name").slice(0, SONG_LIMITS.name);
  const parent = str(form, "parentId") || null;
  const all = await db.songFolder.findMany({ select: { id: true, name: true, parentId: true } });
  if (!name || wouldCycle(all, id, parent)) return;
  await db.songFolder.update({ where: { id }, data: { name, parentId: parent } });
  refresh();
}

// Deleting a folder never deletes songs or sub-folders: they move up one level.
export async function deleteFolder(form: FormData) {
  await requireAdmin("/admin/songbook");
  const id = str(form, "id");
  const folder = await db.songFolder.findUnique({ where: { id } });
  if (!folder) return;
  await db.$transaction([
    db.songFolder.updateMany({ where: { parentId: id }, data: { parentId: folder.parentId } }),
    db.song.updateMany({ where: { folderId: id }, data: { folderId: folder.parentId } }),
    db.songFolder.delete({ where: { id } }),
  ]);
  refresh();
}
