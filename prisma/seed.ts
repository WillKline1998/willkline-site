// Seeds the local dev database with Will's real catalog (prisma/seed-data/music.json)
// plus a few bulletin-board notices. Safe to re-run: upserts by slug, and
// notices are replaced wholesale.
// Run: npm run db:seed

import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient();

type Release = { title: string; kind: string; cover?: string; links: Record<string, string> };
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
      sortOrder: i,
      published: true,
    };
    await db.album.upsert({ where: { slug }, update: data, create: { slug, ...data } });
  }

  // Notices are demo content until the admin page exists (M3): replace wholesale.
  await db.notice.deleteMany();
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
  for (const [i, { media = [], ...n }] of notices.entries()) {
    await db.notice.create({
      data: {
        ...n,
        createdAt: new Date(Date.now() - i * 60_000),
        media: { create: media.map((m, position) => ({ ...m, position })) },
      },
    });
  }

  console.log(`Seeded ${catalog.releases.length} releases and ${notices.length} notices.`);
}

main().finally(() => db.$disconnect());
