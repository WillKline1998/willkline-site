import "server-only";
import { fileFrom, str } from "@/lib/forms";
import { ImageError, isWebUrl, saveResizedImage } from "@/lib/images";
import { deleteFile, keyFromUrl } from "@/lib/storage";

export type LeadMedia = { mediaKind: string | null; mediaUrl: string | null };

async function dropImage(url: string | null) {
  const key = url && keyFromUrl(url);
  if (key) await deleteFile(key);
}

/**
 * Applies the <PictureOrVideo> field to an item's current lead media.
 * Returns the new values, or { error } (nothing is changed on error).
 */
export async function resolveLeadMedia(form: FormData, current: LeadMedia, maxSide = 1600): Promise<LeadMedia | { error: string }> {
  const choice = str(form, "media") || "none";
  const file = fileFrom(form, "image");

  if (choice === "image") {
    if (!file) return current.mediaKind === "IMAGE" ? current : { error: "Choose a picture to upload, or pick None." };
    try {
      const url = await saveResizedImage(file, { maxSide });
      await dropImage(current.mediaKind === "IMAGE" ? current.mediaUrl : null);
      return { mediaKind: "IMAGE", mediaUrl: url };
    } catch (e) {
      return { error: e instanceof ImageError ? e.message : "Couldn't save that picture." };
    }
  }
  if (choice === "video") {
    const url = str(form, "video");
    if (!isWebUrl(url)) return { error: "Paste the full video link (it starts with https://)." };
    await dropImage(current.mediaKind === "IMAGE" ? current.mediaUrl : null);
    return { mediaKind: "VIDEO", mediaUrl: url };
  }
  await dropImage(current.mediaKind === "IMAGE" ? current.mediaUrl : null);
  return { mediaKind: null, mediaUrl: null };
}

export async function deleteLeadMedia(m: LeadMedia) {
  await dropImage(m.mediaKind === "IMAGE" ? m.mediaUrl : null);
}
