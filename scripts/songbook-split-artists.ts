// One-off, idempotent: songs imported as "Artist - Title" with no artist get the two split apart
// ("Radiohead - Airbag" -> artist "Radiohead", title "Airbag"). Songs that already have an artist, or whose title
// has no " - " (hymns), are left alone. Slugs don't change, so every song keeps its URL. Never deletes anything.
//   npx tsx scripts/songbook-split-artists.ts           # dry run
//   npx tsx scripts/songbook-split-artists.ts --apply
import "dotenv/config";
import { db } from "../src/lib/db";
import { splitArtist } from "../src/lib/songbook";

async function main() {
  const apply = process.argv.includes("--apply");
  const songs = await db.song.findMany({ where: { artist: "" }, select: { id: true, title: true }, orderBy: { title: "asc" } });
  const changes = songs.map((s) => ({ ...s, next: splitArtist(s.title) })).filter((c) => c.next.artist);
  const total = await db.song.count();
  console.log(`${total} songs; ${songs.length} with no artist; ${changes.length} to split.`);
  for (const c of changes) console.log(`  "${c.title}" -> artist "${c.next.artist}", title "${c.next.title}"`);
  if (!apply) return console.log(changes.length ? "Dry run. Re-run with --apply." : "Nothing to do.");
  await db.$transaction(changes.map((c) => db.song.update({ where: { id: c.id }, data: { title: c.next.title, artist: c.next.artist } })));
  const after = await db.song.count();
  console.log(`Done. ${changes.length} updated. Songs ${total} -> ${after}.`);
}

main()
  .catch((e) => {
    console.error(String(e?.message ?? e));
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
