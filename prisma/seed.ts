// Seeds a database with Will's starting content (catalog, bio, CV, documents,
// example bulletin posts, first Lab project). FILL-ONLY: it never overwrites
// or deletes anything that already exists, so it's safe against the live
// site, where Will edits content through the admin.
// Run: npm run db:seed

import "dotenv/config";
import { readFileSync, statSync } from "node:fs";
import { saveFile } from "../src/lib/storage";
import { db } from "../src/lib/db";

type Release = { title: string; kind: string; cover?: string; year?: number; links: Record<string, string> };
type Catalog = { releases: Release[] };

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Apple Music URLs reveal the release type ("…/x25-ep/…", "…-single/…").
const kindOf = (r: Release) => {
  if (r.kind === "soundcloud-set") return "PROJECT";
  const apple = r.links.apple ?? "";
  if (r.kind === "EP" || /-ep\//.test(apple)) return "EP";
  if (/-single\//.test(apple)) return "SINGLE";
  return "ALBUM";
};

async function main() {
  const catalog: Catalog = JSON.parse(readFileSync("prisma/seed-data/music.json", "utf8"));

  for (const [i, r] of catalog.releases.entries()) {
    const slug = slugify(r.title);
    const data = {
      title: r.title,
      kind: kindOf(r),
      links: JSON.stringify(r.links),
      coverUrl: r.cover ?? null, // local file in public/covers (scripts/fetch_catalog.py)
      year: r.year ?? null, // from Apple's catalog release dates
      sortOrder: i,
      published: true,
    };
    await db.album.upsert({ where: { slug }, update: {}, create: { slug, ...data } });
  }

  // Track lists (from Apple Music / SoundCloud), only for releases that have none yet.
  const trackData: { albums: Record<string, { title: string; durationSec: number | null }[]> } =
    JSON.parse(readFileSync("prisma/seed-data/tracks.json", "utf8"));
  for (const [title, tracks] of Object.entries(trackData.albums)) {
    const album = await db.album.findUnique({ where: { slug: slugify(title) }, include: { _count: { select: { tracks: true } } } });
    if (!album || album._count.tracks > 0) continue;
    await db.track.createMany({ data: tracks.map((t, i) => ({ albumId: album.id, position: i + 1, ...t })) });
  }

  // Bio text (SiteSetting "bio"); admin-editable in M3.
  const bio = readFileSync("prisma/seed-data/bio.md", "utf8");
  await db.siteSetting.upsert({ where: { key: "bio" }, update: {}, create: { key: "bio", value: bio } });

  // CV page text (SiteSetting "cv"): structured JSON, phone number omitted on purpose.
  const cv = readFileSync("prisma/seed-data/cv.json", "utf8");
  await db.siteSetting.upsert({ where: { key: "cv" }, update: {}, create: { key: "cv", value: cv } });

  // Backfill Upload rows for files stored before the Upload table existed.
  for (const d of await db.document.findMany()) {
    await db.upload.upsert({
      where: { key: d.fileKey },
      update: {},
      create: { key: d.fileKey, fileName: d.fileName, mimeType: d.mimeType, size: d.size },
    });
  }

  // Starter downloads. Only seeded when there are none, so Will's uploads are never clobbered.
  if ((await db.document.count()) === 0) {
    const starters = [
      { title: "Résumé", description: "One page, software-focused", file: "Will_Kline_Resume.pdf" },
      { title: "Curriculum Vitae", description: "Full version, with music, teaching, and performance history", file: "Will_Kline_CV.pdf" },
    ];
    for (const [i, s] of starters.entries()) {
      const path = `prisma/seed-data/documents/${s.file}`;
      const fileKey = await saveFile(readFileSync(path), s.file, "application/pdf");
      await db.document.create({
        data: { title: s.title, description: s.description, fileKey, fileName: s.file, mimeType: "application/pdf", size: statSync(path).size, sortOrder: i + 1 },
      });
    }
  }

  // Example bulletin posts, only for an empty board.
  const notices = [
    {
      kind: "NEWS",
      title: "Welcome to willkline.net",
      body: "This site is under construction, built in public. Music, writing, experiments, and whatever else I'm up to will land here first.",
      pinned: true,
    },
    {
      kind: "RELEASE",
      title: "BECOMING",
      body: "Give it a listen. Every release now has its own page on the site.",
      linkHref: "/music/becoming",
      linkLabel: "About this album →",
      media: [{ kind: "EMBED", url: "https://open.spotify.com/album/0kiVJpJSOSltv0nk1hkkqU" }],
    },
    {
      kind: "SHOW",
      title: "[Example] Solo bass recital",
      body: "Placeholder showing a show post with a flyer and a program PDF attached.",
      eventDate: new Date("2026-11-14T19:30:00-05:00"),
      venue: "Somewhere in Cleveland, OH",
      media: [
        { kind: "IMAGE", url: "/images/example-flyer.png", caption: "Flyer (example)" },
        { kind: "FILE", url: "/files/example-program.pdf", caption: "Recital program (example PDF)" },
      ],
    },
    {
      kind: "NOTE",
      title: "From the archive: COOKY",
      body: "Older, unremastered work that only lives on SoundCloud for now.",
      media: [{ kind: "EMBED", url: "https://soundcloud.com/will-kline-36214054/sets/cooky" }],
    },
    {
      kind: "NOTE",
      title: "[Example] Something I've been watching",
      body: "Placeholder showing how a YouTube link appears in a post.",
      media: [
        { kind: "EMBED", url: "https://www.youtube.com/watch?v=P4uPK809WlM", caption: "Edgar Meyer, BACH & friends (Michael Lawrence Films)" },
      ],
    },
  ];
  // Spread createdAt so "newest first" order matches the list above.
  const freshBoard = (await db.notice.count()) === 0;
  for (const [i, { media = [], ...n }] of freshBoard ? notices.entries() : []) {
    await db.notice.create({
      data: {
        ...n,
        createdAt: new Date(Date.now() - i * 60_000),
        media: { create: media.map((m, position) => ({ ...m, position })) },
      },
    });
  }


  // First Lab project: the site itself.
  if ((await db.labProject.count()) === 0) {
    await db.labProject.create({
      data: {
        slug: "willkline-net",
        title: "willkline.net",
        status: "LIVE",
        description: "This site: a self-hosted artist page with its own admin, built from scratch.",
        tech: "Next.js, React, TypeScript, PostgreSQL, Prisma, Vercel",
        url: "https://willkline.net",
        body: readFileSync("prisma/seed-data/lab-willkline-net.md", "utf8"),
        sortOrder: 1,
      },
    });
  }

  console.log("Seed complete (fill-only: existing content untouched).");
}

main().finally(() => db.$disconnect());
