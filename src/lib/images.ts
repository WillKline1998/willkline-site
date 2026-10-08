import "server-only";
import sharp from "sharp";
import { saveFile } from "@/lib/storage";

// Uploaded images are re-encoded on the way in: auto-rotated, shrunk to fit
// `maxSide`, metadata (GPS etc.) stripped, saved as WebP. That keeps a
// 12-megapixel phone photo at a few hundred KB and normalizes odd formats.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function saveResizedImage(file: File, { maxSide = 1200 } = {}): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new ImageError("That image is over 4 MB. Try a smaller one.");
  let out: Buffer;
  try {
    out = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new ImageError("That file isn't an image we can read (try JPG, PNG, or WebP).");
  }
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  const key = await saveFile(out, `${base}.webp`, "image/webp");
  return `/uploads/${encodeURIComponent(key)}`;
}

export class ImageError extends Error {}

/** True for a full http(s) URL (used for video links). */
export function isWebUrl(s: string) {
  try {
    return /^https?:$/.test(new URL(s).protocol);
  } catch {
    return false;
  }
}
