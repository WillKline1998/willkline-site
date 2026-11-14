"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { clientIp, visitorHash } from "@/lib/dingdong-gifts";
import { GIFT_LIMITS, readGiftWords } from "@/lib/dingdong-vocab";

export type GiftState = { ok?: string; error?: string; sent?: number };

// Leave DingDong a word. Allow-listed vocabulary only (that list is the whole injection defence for v0),
// a few gifts per visitor per day, and a site-wide daily ceiling so the table can't be flooded.
export async function giveWords(prev: GiftState, form: FormData): Promise<GiftState> {
  const fail = (error: string): GiftState => ({ error, sent: prev.sent }); // same `sent` = the picker keeps its picks
  if (String(form.get("website") ?? "") !== "") return fail("Something went wrong. Try again."); // honeypot
  const parsed = readGiftWords(form.getAll("word"));
  if (parsed.error !== undefined) return fail(parsed.error);
  const { words } = parsed;

  const hash = visitorHash(clientIp(await headers()));
  const since = new Date(Date.now() - 24 * 3600_000);
  const [mine, all] = await Promise.all([
    db.dingDongGift.count({ where: { visitorHash: hash } }),
    db.dingDongGift.count({ where: { createdAt: { gt: since } } }),
  ]);
  if (mine >= GIFT_LIMITS.giftsPerVisitorPerDay) {
    return fail("That's enough words for today. He has to sleep on them. Come back tomorrow.");
  }
  if (all >= GIFT_LIMITS.giftsPerDayAll) return fail("His doorstep is full today. Try again tomorrow.");

  await db.dingDongGift.create({ data: { words, visitorHash: hash } });
  revalidatePath("/dingdong");
  return { sent: Date.now(), ok: `Left by his door: ${words.join(", ")}. He'll look tomorrow morning, maybe.` };
}
