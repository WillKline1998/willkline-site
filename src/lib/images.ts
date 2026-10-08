import "server-only";
import sharp from "sharp";
import { saveFile } from "@/lib/storage";

// Member-uploaded images are re-encoded on the way in: auto-rotated, shrunk to
// fit 1200×1200, metadata (GPS etc.) stripped, saved as WebP. That keeps a
// 12-megapixel phone photo at a few hundred KB and normalizes odd formats.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function saveResizedImage(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new ImageError("That image is over 4 MB. Try a smaller one.");
  let out: Buffer;
  try {
    out = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new ImageError("That file isn't an image we can read (try JPG, PNG, or WebP).");
  }
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  const key = await saveFile(out, `${base}.webp`, "image/webp");
  return `/uploads/${encodeURIComponent(key)}`;
}

export class ImageError extends Error {}
