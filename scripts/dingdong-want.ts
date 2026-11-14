// Grant or decline DingDong's asks from the command line (how Hermes does it from Telegram).
//   npx tsx scripts/dingdong-want.ts list                     # pending + decided asks
//   npx tsx scripts/dingdong-want.ts grant flute              # by word (the newest pending ask for it) or by id
//   npx tsx scripts/dingdong-want.ts decline flute
//   npx tsx scripts/dingdong-want.ts reopen flute             # undo a decision
// Uses DATABASE_URL from the environment; for the live site source ~/.config/dingdong/prod.env first:
//   ( set -a; . ~/.config/dingdong/prod.env; set +a; npx tsx scripts/dingdong-want.ts grant flute )
import "dotenv/config";
import { db } from "../src/lib/db";

async function find(key: string, status: string | { not: string }) {
  return db.dingDongWant.findFirst({ where: { OR: [{ id: key }, { word: key.toLowerCase() }], status }, orderBy: { createdAt: "desc" } });
}

async function main() {
  const [cmd, key] = process.argv.slice(2);
  if (cmd === "list" || !cmd) {
    const wants = await db.dingDongWant.findMany({ orderBy: [{ status: "desc" }, { createdAt: "desc" }] });
    if (!wants.length) return console.log("DingDong hasn't asked for anything yet.");
    for (const w of wants) {
      console.log(`${w.status.padEnd(8)} ${w.word.padEnd(12)} ${w.createdAt.toISOString().slice(0, 10)}  ${w.reason}  [${w.id}]`);
    }
    return;
  }
  if (!["grant", "decline", "reopen"].includes(cmd) || !key)
    throw new Error("usage: dingdong-want.ts list | grant|decline|reopen <word|id>");
  if (cmd === "reopen") {
    const w = await find(key, { not: "pending" });
    if (!w) throw new Error(`no decided ask for "${key}"`);
    await db.dingDongWant.update({ where: { id: w.id }, data: { status: "pending", grantedAt: null } });
    return console.log(`Reopened: ${w.word} is pending again.`);
  }
  const w = await find(key, "pending");
  if (!w) throw new Error(`no pending ask for "${key}" (try: list)`);
  const status = cmd === "grant" ? "granted" : "declined";
  await db.dingDongWant.update({ where: { id: w.id }, data: { status, grantedAt: new Date() } });
  console.log(`${status === "granted" ? "Granted" : "Declined"}: ${w.word}. He'll know at his next wake-up.`);
}

main()
  .catch((e) => {
    console.error("dingdong-want:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
