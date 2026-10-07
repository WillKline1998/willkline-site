// File storage for admin uploads (documents now; images/audio later).
// Local driver: files live in ./storage/uploads (gitignored) and are served
// by src/app/uploads/[key]/route.ts. At launch (M7) swap in a cloud driver
// (e.g. Vercel Blob / S3) behind the same three functions.

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.join(process.cwd(), "storage", "uploads");

const safe = (name: string) =>
  name.normalize("NFKD").replace(/[^\w.\-]+/g, "-").replace(/-+/g, "-").slice(-80) || "file";

export async function saveFile(data: Buffer, originalName: string): Promise<string> {
  await mkdir(DIR, { recursive: true });
  const key = `${randomUUID().slice(0, 8)}-${safe(originalName)}`;
  await writeFile(path.join(DIR, key), data);
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
}

export const fileUrl = (key: string) => `/uploads/${encodeURIComponent(key)}`;

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
