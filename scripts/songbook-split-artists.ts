// One-off, idempotent: songs imported as "Artist - Title" with no artist get the two split apart
// ("Radiohead - Airbag" -> artist "Radiohead", title "Airbag"). Songs that already have an artist, or whose title
// has no " - " (hymns), are left alone. Slugs don't change, so every song keeps its URL. Never deletes anything.
// Scoped to ONE folder's direct songs (--folder <id>): nothing in its sub-folders, nothing elsewhere.
//   npx tsx scripts/songbook-split-artists.ts --folder <folderId>           # dry run
//   npx tsx scripts/songbook-split-artists.ts --folder <folderId> --apply
import "dotenv/config";
import { db } from "../src/lib/db";
import { splitArtist } from "../src/lib/songbook";

async function main() {
  const apply = process.argv.includes("--apply");
  const at = process.argv.indexOf("--folder");
  const folderId = at > 0 ? process.argv[at + 1] : undefined;
  if (!folderId || folderId.startsWith("--")) throw new Error("Pass --folder <folderId> (the folder whose own songs to split).");
  const folder = await db.songFolder.findUnique({ where: { id: folderId }, select: { name: true } });
  if (!folder) throw new Error(`No folder with id ${folderId}.`);
  const songs = await db.song.findMany({
    where: { artist: "", folderId },
    select: { id: true, title: true, slug: true },
    orderBy: { title: "asc" },
  });
  const changes = songs.map((s) => ({ ...s, next: splitArtist(s.title) })).filter((c) => c.next.artist);
  const skipped = songs.filter((s) => !changes.some((c) => c.id === s.id));
  const inFolder = await db.song.count({ where: { folderId } });
  console.log(`Folder "${folder.name}": ${inFolder} songs directly in it; ${songs.length} with no artist; ${changes.length} to split.`);
  for (const c of changes) console.log(`  "${c.title}" -> artist "${c.next.artist}" | title "${c.next.title}"`);
  for (const s of skipped) console.log(`  (left alone, no " - "): "${s.title}"`);
  if (!apply || !changes.length) return console.log(changes.length ? "Dry run. Re-run with --apply." : "Nothing to do.");
  // Interactive transaction (all or nothing) with a generous timeout: ~70 sequential updates over Neon take >5s.
  await db.$transaction(
    async (tx) => {
      for (const c of changes) await tx.song.update({ where: { id: c.id }, data: { title: c.next.title, artist: c.next.artist } });
    },
    { timeout: 120_000, maxWait: 20_000 },
  );
  console.log(`Done. ${changes.length} updated in "${folder.name}".`);
}

main()
  .catch((e) => {
    console.error(String(e?.message ?? e));
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
