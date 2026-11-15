// One-off, idempotent: lift the Songbook out of its single top folder ("Will Standards") so Covers and Originals sit
// at the root. Hymns stays INSIDE Covers (only Covers itself moves, so everything under it comes along untouched).
// Songs loose directly in Will Standards go into Covers. The Will Standards node is deleted only once it is empty.
// It never deletes a song, and it aborts (rolls back) unless the song count and every untouched song's folder are
// the same afterwards.
//   npx tsx scripts/songbook-flatten-root.ts            # dry run: prints the plan, changes nothing
//   npx tsx scripts/songbook-flatten-root.ts --apply    # does it (in one transaction)
// Production: ( set -a; . ~/.config/dingdong/prod.env; set +a; npx tsx scripts/songbook-flatten-root.ts --apply )
import "dotenv/config";
import { db } from "../src/lib/db";

const TOP = "Will Standards";
const LIFT = ["Covers", "Originals"];
const LOOSE_GOES_TO = "Covers";

type Snap = { total: number; byFolderPath: Map<string, string>; folders: { id: string; name: string; parentId: string | null }[] };

async function snapshot(tx: Pick<typeof db, "song" | "songFolder"> = db): Promise<Snap> {
  const folders = await tx.songFolder.findMany({ select: { id: true, name: true, parentId: true } });
  const songs = await tx.song.findMany({ select: { id: true, folderId: true } });
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path = (id: string | null) => {
    const out: string[] = [];
    for (let cur = id ? byId.get(id) : undefined, n = 0; cur && n < 50; cur = cur.parentId ? byId.get(cur.parentId) : undefined, n++) out.unshift(cur.name);
    return out.join(" / ") || "(no folder)";
  };
  return { total: songs.length, byFolderPath: new Map(songs.map((s) => [s.id, path(s.folderId)])), folders };
}

function tally(s: Snap) {
  const t = new Map<string, number>();
  for (const p of s.byFolderPath.values()) t.set(p, (t.get(p) ?? 0) + 1);
  return [...t.entries()].sort().map(([p, n]) => `  ${String(n).padStart(3)}  ${p}`).join("\n");
}

async function main() {
  const apply = process.argv.includes("--apply");
  const before = await snapshot();
  console.log(`Before: ${before.total} songs\n${tally(before)}`);

  const tops = before.folders.filter((f) => f.parentId === null && f.name === TOP);
  if (tops.length === 0) {
    console.log(`\nNo top-level "${TOP}" folder: already migrated. Nothing to do.`);
    return;
  }
  if (tops.length > 1) throw new Error(`Found ${tops.length} top-level "${TOP}" folders; sort that out by hand first.`);
  const top = tops[0];
  const kids = before.folders.filter((f) => f.parentId === top.id);
  for (const name of LIFT) {
    if (before.folders.some((f) => f.parentId === null && f.name === name) && kids.some((k) => k.name === name))
      throw new Error(`There's already a top-level "${name}" AND one inside ${TOP}; merge them by hand first.`);
  }
  const lift = kids.filter((k) => LIFT.includes(k.name));
  const others = kids.filter((k) => !LIFT.includes(k.name));
  const coversId = kids.find((k) => k.name === LOOSE_GOES_TO)?.id ?? before.folders.find((f) => f.parentId === null && f.name === LOOSE_GOES_TO)?.id;
  const loose = await db.song.findMany({ where: { folderId: top.id }, select: { id: true, title: true }, orderBy: { title: "asc" } });
  if (loose.length && !coversId) throw new Error(`${loose.length} songs sit loose in ${TOP} but there's no ${LOOSE_GOES_TO} folder to put them in.`);

  console.log(`\nPlan:`);
  for (const k of lift) console.log(`  move folder "${k.name}" (and everything inside it) to the top level`);
  for (const k of others) console.log(`  move folder "${k.name}" to the top level too (it was also inside ${TOP})`);
  console.log(loose.length ? `  move ${loose.length} loose songs into ${LOOSE_GOES_TO}: ${loose.map((s) => s.title).join("; ")}` : `  no loose songs in ${TOP}`);
  console.log(`  delete the empty "${TOP}" folder`);
  if (!apply) {
    console.log(`\nDry run. Re-run with --apply to do it.`);
    return;
  }

  await db.$transaction(async (tx) => {
    for (const k of kids) await tx.songFolder.update({ where: { id: k.id }, data: { parentId: null } });
    if (loose.length) await tx.song.updateMany({ where: { folderId: top.id }, data: { folderId: coversId! } });
    const left = { songs: await tx.song.count({ where: { folderId: top.id } }), folders: await tx.songFolder.count({ where: { parentId: top.id } }) };
    if (left.songs || left.folders) throw new Error(`"${TOP}" still holds ${left.songs} songs / ${left.folders} folders; rolled back.`);
    await tx.songFolder.delete({ where: { id: top.id } });

    // Safety: same number of songs, and every song's folder path is the old one minus the "Will Standards / " prefix.
    const after = await snapshot(tx);
    if (after.total !== before.total) throw new Error(`Song count changed ${before.total} -> ${after.total}; rolled back.`);
    const loosed = new Set(loose.map((s) => s.id));
    for (const [id, was] of before.byFolderPath) {
      const want = loosed.has(id) ? LOOSE_GOES_TO : was.startsWith(`${TOP} / `) ? was.slice(TOP.length + 3) : was;
      if (after.byFolderPath.get(id) !== want) throw new Error(`Song ${id} would end up in "${after.byFolderPath.get(id)}" instead of "${want}"; rolled back.`);
    }
  });

  const after = await snapshot();
  console.log(`\nAfter: ${after.total} songs\n${tally(after)}`);
  console.log(after.total === before.total ? `\nOK: song count identical (${before.total} -> ${after.total}).` : `\nMISMATCH`);
  if (loose.length) console.log(`Loose songs moved into ${LOOSE_GOES_TO}: ${loose.map((s) => s.title).join("; ")}`);
}

main()
  .catch((e) => {
    console.error(String(e?.message ?? e));
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
