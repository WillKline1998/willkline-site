// The 9 AM engine's mailbox. Prints what DingDong should look at this morning as JSON on stdout:
//   { "gifts": [{ id, words, createdAt }], "wants": [{ id, word, status, grantedAt }] }
// gifts = the oldest few still-pending gifts (re-checked against the vocabulary, so a bad row is just skipped);
// wants = every ask with its current status, so the engine learns about grants/declines.
//   npx tsx scripts/dingdong-gifts.ts pull [--limit 3]
// Results go back through scripts/import-dingdong-day.ts (the day file's "gifts" block).
import "dotenv/config";
import { db } from "../src/lib/db";
import { VOCAB_SET } from "../src/lib/dingdong-vocab";

async function main() {
  const args = process.argv.slice(2);
  if (args[0] !== "pull") throw new Error("usage: dingdong-gifts.ts pull [--limit N]");
  const i = args.indexOf("--limit");
  const limit = Math.min(10, Math.max(0, Number(i >= 0 ? args[i + 1] : 3) || 0));
  const [rows, wants] = await Promise.all([
    db.dingDongGift.findMany({ where: { status: "pending" }, orderBy: { createdAt: "asc" }, take: 50 }),
    db.dingDongWant.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, word: true, status: true, grantedAt: true } }),
  ]);
  const gifts = rows
    .map((g) => ({ id: g.id, words: g.words.filter((w) => VOCAB_SET.has(w)).slice(0, 3), createdAt: g.createdAt }))
    .filter((g) => g.words.length)
    .slice(0, limit);
  process.stdout.write(JSON.stringify({ gifts, wants }, null, 2) + "\n");
}

main()
  .catch((e) => {
    console.error("dingdong-gifts:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
