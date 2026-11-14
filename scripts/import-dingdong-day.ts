// Import DingDong day files (the spike's out/days/day-NNN.json) into the DingDongDay table.
// Idempotent: a day number that already exists is updated in place.
//   npx tsx scripts/import-dingdong-day.ts ~/Projects/dingdong-spike/out/days/day-*.json   (backfill)
//   npx tsx scripts/import-dingdong-day.ts path/to/day-010.json                         (daily cron)
// A day's optional "gifts" block (from the engine's morning digest) is applied too, idempotently:
//   results  -> marks those gifts ignored/processed (only if still pending; a gift he never got to stays pending)
//   wants    -> creates his new asks with a deterministic id, so re-importing old days never duplicates them
//   note     -> his one line about the gifts, shown on the day card
// Uses DATABASE_URL from the environment (the cron passes the production one).
import "dotenv/config";
import { readFileSync } from "node:fs";
import { db } from "../src/lib/db";
import { VOCAB_SET } from "../src/lib/dingdong-vocab";

type GiftBlock = {
  results?: { id?: unknown; status?: unknown; importance?: unknown }[];
  wants?: { word?: unknown; reason?: unknown }[];
  note?: unknown;
};

type DayFile = {
  day: number;
  stage: string;
  diary: string;
  taste_note?: string;
  liked_it?: boolean | null;
  pattern: unknown;
  fallback?: boolean;
  date?: string;
  generated_at?: string;
  gifts?: GiftBlock | null;
};

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

// Never throws: a malformed gifts block just gets skipped (logged), and the day itself still imports.
async function applyGifts(day: number, g: GiftBlock | null | undefined, when: Date) {
  if (!g || typeof g !== "object") return "";
  let marked = 0;
  let asked = 0;
  for (const r of Array.isArray(g.results) ? g.results : []) {
    if (typeof r?.id !== "string" || (r.status !== "ignored" && r.status !== "processed")) continue;
    const importance = typeof r.importance === "number" ? Math.round(Math.min(10, Math.max(1, r.importance))) : null;
    const { count } = await db.dingDongGift.updateMany({
      where: { id: r.id, status: "pending" },
      data: { status: r.status, importance, processedAt: when },
    });
    marked += count;
  }
  for (const w of Array.isArray(g.wants) ? g.wants : []) {
    const word = clean(w?.word, 24).toLowerCase();
    const reason = clean(w?.reason, 240);
    if (!VOCAB_SET.has(word) || !reason) continue;
    const id = `want-d${day}-${word.replace(/[^a-z]+/g, "-")}`;
    const exists = await db.dingDongWant.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      await db.dingDongWant.create({ data: { id, word, reason, createdAt: when } });
      asked++;
    }
  }
  return marked || asked ? ` (gifts: ${marked} read, ${asked} new ask${asked === 1 ? "" : "s"})` : "";
}

async function main() {
  const paths = process.argv.slice(2);
  if (!paths.length) throw new Error("usage: import-dingdong-day.ts <day.json>...");
  for (const path of paths) {
    const d = JSON.parse(readFileSync(path, "utf8")) as DayFile;
    if (!Number.isInteger(d.day) || d.day < 1 || typeof d.diary !== "string" || !d.diary.trim()) {
      throw new Error(`${path}: missing day number or diary`);
    }
    const created = d.generated_at && !isNaN(Date.parse(d.generated_at)) ? new Date(d.generated_at) : new Date();
    const data = {
      stage: String(d.stage || "pulse"),
      diary: d.diary.trim(),
      tasteNote: typeof d.taste_note === "string" ? d.taste_note.trim() : "",
      likedIt: typeof d.liked_it === "boolean" ? d.liked_it : null,
      pattern: (d.pattern ?? {}) as object,
      fallback: !!d.fallback,
      dayDate: typeof d.date === "string" ? d.date.replace(/\s*\(.*\)$/, "") : "",
      giftNote: clean(d.gifts?.note, 200),
      createdAt: created,
    };
    await db.dingDongDay.upsert({ where: { day: d.day }, create: { day: d.day, ...data }, update: data });
    let extra = "";
    try {
      extra = await applyGifts(d.day, d.gifts, created);
    } catch (e) {
      extra = ` (gifts block skipped: ${e instanceof Error ? e.message : e})`;
    }
    console.log(`dingdong import: day ${d.day} ok${extra}`);
  }
}

main()
  .catch((e) => {
    console.error("dingdong import failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
