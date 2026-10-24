// Bulk-import arrangement PDFs into the Songbook from a manifest. Safe to re-run (skips titles already there).
//   npx tsx scripts/import-songs.ts manifest.json [--publish]
// manifest.json: [{ "file": "/abs/path.pdf", "title": "Amazing Grace", "folders": ["Will Standards", "Covers", "Hymns"] }]
// Imported songs are NOT visible to the public unless --publish is given: review them in /admin/songbook first.
// Production one-off: pull the production env to a temp file, source it, run this, delete the file (see the willkline-site skill).
import "dotenv/config";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { db } from "../src/lib/db";
import { uniqueSlug } from "../src/lib/forms";
import { saveFile } from "../src/lib/storage";

type Entry = { file: string; title: string; folders?: string[]; artist?: string };

async function folderFor(path: string[]): Promise<string | null> {
  let parentId: string | null = null;
  for (const name of path) {
    const found: { id: string } | null = await db.songFolder.findFirst({ where: { name, parentId }, select: { id: true } });
    parentId = found?.id ?? (await db.songFolder.create({ data: { name, parentId } })).id;
  }
  return parentId;
}

async function main() {
  const [manifest, ...flags] = process.argv.slice(2);
  const publish = flags.includes("--publish");
  const entries: Entry[] = JSON.parse(readFileSync(manifest, "utf8"));
  for (const e of entries) {
    if (await db.song.findFirst({ where: { title: e.title } })) {
      console.log(`skip (already there): ${e.title}`);
      continue;
    }
    const bytes = readFileSync(e.file);
    if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
      console.log(`skip (not a PDF): ${e.file}`);
      continue;
    }
    const pages = (await PDFDocument.load(bytes, { ignoreEncryption: true })).getPageCount();
    const key = await saveFile(bytes, e.file.split("/").pop()!, "application/pdf");
    const slug = await uniqueSlug(e.title, async (s) => !!(await db.song.findUnique({ where: { slug: s }, select: { id: true } })));
    await db.song.create({
      data: { slug, title: e.title, artist: e.artist ?? "", fileKey: key, fileName: e.file.split("/").pop()!, size: bytes.length, pages, folderId: await folderFor(e.folders ?? []), published: publish },
    });
    console.log(`added: ${e.title} (${pages} page${pages === 1 ? "" : "s"}) -> ${(e.folders ?? []).join(" / ") || "no folder"}${publish ? "" : "  [not visible yet]"}`);
  }
}
main().finally(() => db.$disconnect());
