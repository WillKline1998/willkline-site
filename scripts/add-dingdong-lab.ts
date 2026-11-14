// One-off: adds (or refreshes) the DingDong card in the Lab. Safe to re-run; edit the text here and re-run
// to update the entry as the project grows (the Lab card is a snapshot, not a changelog).
import "dotenv/config";
import { db } from "../src/lib/db";

const entry = {
  title: "DingDong",
  status: "BUILDING",
  description:
    "A small AI creature who lives on this site. He wakes up every morning, works on his ears a little, reads the words visitors leave him, and sometimes asks for things.",
  body: `## What it is

DingDong is an AI creature who lives at [willkline.net/dingdong](/dingdong). Every morning at 9 he wakes up, practises one thing about listening, writes in his diary, and makes a small tune.

He starts with almost nothing. First he only hears pulse, then pitch, then intervals, and each new stage unlocks only when he's ready. Over time he's meant to grow real taste of his own.

## Where to see him

His life feed and his Studio are public. In the Studio he wanders around, his mood shows, and you can press play to hear what he made that day.

## Leaving him a word

Visitors can leave him up to three words from a short list (instruments, sounds, moods, genres). Each morning he reads a few and usually shrugs. When the same word keeps catching his attention, a program counts it, the count fades over time, and past a set line he asks for it in his "DingDong asks for…" trough. I decide what he gets.

## How it's built

A Python script, run by Hermes Agent, wakes him up and asks a language model (GLM 5.3) for his day. The day is saved to the site's database and shown with Next.js. The tunes play in your browser with Tone.js.
`,
  tech: "Next.js, TypeScript, Prisma, PostgreSQL, Tone.js, Python, Hermes Agent, Vercel",
  url: "https://willkline.net/dingdong",
};

async function main() {
  const slug = "dingdong";
  if (await db.labProject.findUnique({ where: { slug } })) {
    await db.labProject.update({ where: { slug }, data: entry });
    return console.log("Updated DingDong in the Lab.");
  }
  const last = await db.labProject.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  await db.labProject.create({ data: { slug, ...entry, sortOrder: (last?.sortOrder ?? 0) + 1 } });
  console.log("Added DingDong to the Lab.");
}
main().finally(() => db.$disconnect());
