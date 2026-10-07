// File storage for admin uploads (documents now; images/audio later).
// Local driver: files live in ./storage/uploads (gitignored) and are served
// by src/app/uploads/[key]/route.ts. At launch (M7) swap in a cloud driver
// (e.g. Vercel Blob / S3) behind the same three functions.

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "./db"; // relative: also imported by prisma/seed.ts

const DIR = path.join(process.cwd(), "storage", "uploads");

const safe = (name: string) =>
  name.normalize("NFKD").replace(/[^\w.\-]+/g, "-").replace(/-+/g, "-").slice(-80) || "file";

export async function saveFile(data: Buffer, originalName: string, mimeType = "application/octet-stream"): Promise<string> {
  await mkdir(DIR, { recursive: true });
  const key = `${randomUUID().slice(0, 8)}-${safe(originalName)}`;
  await writeFile(path.join(DIR, key), data);
  await db.upload.create({ data: { key, fileName: originalName, mimeType, size: data.length } });
  return key;
}

export async function readStoredFile(key: string): Promise<Buffer | null> {
  if (key !== path.basename(key)) return null; // no path traversal
  try {
    return await readFile(path.join(DIR, key));
  } catch {
    return null;
  }
}

export async function deleteFile(key: string): Promise<void> {
  if (key !== path.basename(key)) return;
  await unlink(path.join(DIR, key)).catch(() => {});
  await db.upload.deleteMany({ where: { key } });
}

/** Save a browser-uploaded File; returns its key + public URL. */
export async function saveUpload(file: File) {
  const key = await saveFile(Buffer.from(await file.arrayBuffer()), file.name, file.type || "application/octet-stream");
  return { key, url: fileUrl(key), fileName: file.name, mimeType: file.type || "application/octet-stream", size: file.size };
}

/** Key from a /uploads/<key> URL (or null for external URLs). */
export const keyFromUrl = (url: string) => (url.startsWith("/uploads/") ? decodeURIComponent(url.slice(9)) : null);

export const fileUrl = (key: string) => `/uploads/${encodeURIComponent(key)}`;

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
