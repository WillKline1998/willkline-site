// Import DingDong day files (the spike's out/days/day-NNN.json) into the DingDongDay table.
// Idempotent: a day number that already exists is updated in place.
//   npx tsx scripts/import-dingdong-day.ts ~/Projects/dingdong-spike/out/days/day-*.json   (backfill)
//   npx tsx scripts/import-dingdong-day.ts path/to/day-010.json                         (daily cron)
// Uses DATABASE_URL from the environment (the cron passes the production one).
import "dotenv/config";
import { readFileSync } from "node:fs";
import { db } from "../src/lib/db";

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
};

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
      createdAt: created,
    };
    await db.dingDongDay.upsert({ where: { day: d.day }, create: { day: d.day, ...data }, update: data });
    console.log(`dingdong import: day ${d.day} ok`);
  }
}

main()
  .catch((e) => {
    console.error("dingdong import failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
