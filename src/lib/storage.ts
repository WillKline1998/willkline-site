// File storage for admin uploads (documents, bulletin images/PDFs).
// Two drivers behind one API:
//   - Vercel Blob (private store) when BLOB_READ_WRITE_TOKEN is set (production)
//   - local disk in ./storage/uploads otherwise (development; gitignored)
// Every file gets an Upload row; /uploads/[key] streams it to visitors, so
// privacy rules (e.g. hidden documents) live in one place.

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";
import { db } from "./db"; // relative: also imported by prisma/seed.ts

const DIR = path.join(process.cwd(), "storage", "uploads");
const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const blobPath = (key: string) => `uploads/${key}`;
const isPlainKey = (key: string) => key === path.basename(key); // no path traversal

const safe = (name: string) =>
  name.normalize("NFKD").replace(/[^\w.\-]+/g, "-").replace(/-+/g, "-").slice(-80) || "file";

export async function saveFile(data: Buffer, originalName: string, mimeType = "application/octet-stream"): Promise<string> {
  const key = `${randomUUID().slice(0, 8)}-${safe(originalName)}`;
  if (blobEnabled()) {
    await put(blobPath(key), data, { access: "private", contentType: mimeType, addRandomSuffix: false });
  } else {
    await mkdir(DIR, { recursive: true });
    await writeFile(path.join(DIR, key), data);
  }
  await db.upload.create({ data: { key, fileName: originalName, mimeType, size: data.length } });
  return key;
}

/** Stream a stored file's bytes, or null if missing. */
export async function openStoredFile(key: string): Promise<ReadableStream<Uint8Array> | Uint8Array<ArrayBuffer> | null> {
  if (!isPlainKey(key)) return null;
  if (blobEnabled()) {
    const res = await get(blobPath(key), { access: "private" });
    return res?.statusCode === 200 ? res.stream : null;
  }
  try {
    return new Uint8Array(await readFile(path.join(DIR, key))) as Uint8Array<ArrayBuffer>;
  } catch {
    return null;
  }
}

export async function deleteFile(key: string): Promise<void> {
  if (!isPlainKey(key)) return;
  if (blobEnabled()) await del(blobPath(key)).catch(() => {});
  else await unlink(path.join(DIR, key)).catch(() => {});
  await db.upload.deleteMany({ where: { key } });
}

/** Save a browser-uploaded File; returns its key + public URL. */
export async function saveUpload(file: File) {
  const mimeType = file.type || "application/octet-stream";
  const key = await saveFile(Buffer.from(await file.arrayBuffer()), file.name, mimeType);
  return { key, url: fileUrl(key), fileName: file.name, mimeType, size: file.size };
}

export const fileUrl = (key: string) => `/uploads/${encodeURIComponent(key)}`;

/** Key from a /uploads/<key> URL (or null for external URLs). */
export const keyFromUrl = (url: string) => (url.startsWith("/uploads/") ? decodeURIComponent(url.slice(9)) : null);

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
