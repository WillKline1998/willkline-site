import { toEmbed } from "@/lib/embeds";
import { getSetting } from "@/lib/settings";

export const WALL_KINDS = { MUSIC: "Music", VIDEO: "Video", ART: "Art", OTHER: "Other" } as const;
export type WallKind = keyof typeof WALL_KINDS;

export const IMAGE_URL = /\.(png|jpe?g|gif|webp|avif)(\?|$)/i;

/** Best guess from the link; members can change it. */
export function kindFromUrl(url: string): WallKind {
  const e = toEmbed(url);
  if (e.kind === "iframe") return e.provider === "YouTube" || e.provider === "Vimeo" ? "VIDEO" : "MUSIC";
  if (e.kind === "video") return "VIDEO";
  if (e.kind === "audio") return "MUSIC";
  if (IMAGE_URL.test(url)) return "ART";
  return "OTHER";
}

export const HANDLE = /^[a-z0-9_]{3,20}$/;

export const LIMITS = { postsPerDay: 10, signupsPerHour: 20, title: 120, note: 500 };

/** "open" | "closed". Admin toggles this; closed by default until Will decides. */
export async function signupsOpen() {
  return (await getSetting("wall_signups", "closed")) === "open";
}
