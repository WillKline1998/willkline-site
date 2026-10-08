"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { parseDuration } from "@/lib/duration";

export type TracksState = { ok?: boolean; error?: string; savedAt?: number };

// Replaces the album's whole track list with the rows as submitted, in order.
// Rows with no title are ignored (that's how blank "add" rows disappear).
export async function saveTracks(_prev: TracksState, form: FormData): Promise<TracksState> {
  await requireAdmin("/admin/music");
  const albumId = String(form.get("albumId") ?? "");
  const titles = form.getAll("title").map((v) => String(v).trim());
  const durations = form.getAll("duration").map((v) => String(v));

  const rows: { title: string; durationSec: number | null }[] = [];
  for (const [i, title] of titles.entries()) {
    if (!title) continue;
    const durationSec = parseDuration(durations[i] ?? "");
    if (Number.isNaN(durationSec)) return { error: `Track “${title}”: write the duration like 3:25 (or leave it blank).` };
    rows.push({ title: title.slice(0, 200), durationSec });
  }

  const album = await db.album.findUnique({ where: { id: albumId }, select: { slug: true } });
  if (!album) return { error: "That release no longer exists." };
  await db.$transaction([
    db.track.deleteMany({ where: { albumId } }),
    db.track.createMany({ data: rows.map((r, i) => ({ albumId, position: i + 1, ...r })) }),
  ]);
  revalidatePath(`/music/${album.slug}`);
  revalidatePath(`/admin/music/${albumId}`);
  return { ok: true, savedAt: Date.now() };
}
