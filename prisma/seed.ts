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

  await db.notice.deleteMany();
  await db.notice.createMany({
    data: [
      {
        kind: "NEWS",
        title: "Welcome to willkline.net",
        body: "This site is under construction, built in public. Music, writing, experiments, and whatever else I'm up to will land here first.",
        pinned: true,
      },
      {
        kind: "RELEASE",
        title: "The whole catalog, in one place",
        body: `${catalog.releases.length} albums, EPs, and projects, from SoundCloud-era experiments to the latest releases.`,
        linkHref: "/music",
        linkLabel: "Browse the music →",
      },
      {
        kind: "SHOW",
        title: "[Example] An upcoming show",
        body: "Placeholder so the layout can be designed. Will replaces it from the admin page.",
        eventDate: new Date("2026-11-14T19:30:00-05:00"),
        venue: "Somewhere in Cleveland, OH",
      },
      {
        kind: "NOTE",
        title: "[Example] A note from the lab",
        body: "Placeholder: a short post pointing at a new experiment in the Lab.",
        linkHref: "/lab",
        linkLabel: "Visit the Lab →",
      },
    ],
  });

  console.log(`Seeded ${catalog.releases.length} releases and 4 notices.`);
}

main().finally(() => db.$disconnect());
