// Seeds the local dev database with Will's real catalog (prisma/seed-data/music.json)
// plus a few bulletin-board notices. Safe to re-run: upserts by slug, and
// notices are replaced wholesale.
// Run: npm run db:seed

import { readFileSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient();

type Release = { title: string; kind: string; links: Record<string, string> };
type Catalog = { releases: Release[] };

// Cover art from the DistroKid HyperFollow page (imgix CDN; w= controls size).
const covers: Record<string, string> = {
  "X25": "hyperfollow-blob_image_2354621_b98jflccex7h1bcjumq4di_1756123698230.jpg",
  "Glowing": "hyperfollow-blob_image_2354621_ndjyax4p7ra6ehr4r0lzao_1748958211147.jpg",
  "E": "hyperfollow-blob_image_2354621_09o8v14btotv7alnc8vsxk3_1748958211146.jpg",
  "BECOMING": "hyperfollow-blob_image_2354621_b83ep11avwmrqewucbwx5_1748958211144.jpg",
  "Joyful Noise": "hyperfollow-blob_image_2354621_2r2wmvp1l4wr8jm2ak33y_1748958211139.jpg",
  "In Performance": "hyperfollow-blob_image_2354621_ytv5iyhnbne33xesuw2ma_1696597400405.jpg",
  "Dream Journal": "hyperfollow-blob_image_2354621_lycrkigmv1atuo7ufdqu8c_1696597400400.jpg",
  "consumption": "hyperfollow-blob_image_2354621_fshwhxpfwetxcde74dp3pa_1696597400398.jpg",
  "thoughts in isolation": "hyperfollow-blob_image_2354621_y6ujp0konoema5lvfrnisi_1696597400394.jpg",
  "THE ARTS": "hyperfollow-blob_image_2354621_34untsswtzkz8en6c57jx_1696597400388.jpg",
  "Senta: Songs My Mother Taught Me": "hyperfollow-blob_image_2354621_h2bpqu234soklwurugwtvk_1696597400390.jpg",
  "Close Your Eyes.": "hyperfollow-blob_image_2354621_vag9ua8o6uet87k5x9f1q_1696597400383.jpg",
  "COOKY": "hyperfollow-blob_image_2354621_wmnvf93ys5h0saa11st355_1696597400407.jpg",
  "Tempted": "hyperfollow-blob_image_2354621_z7jvb06qxkrkzg07w90jg_1696597400410.jpg",
};
const coverUrl = (file?: string) =>
  file ? `https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F${file}?fm=jpg&q=80&w=600` : null;

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const kindOf = (k: string) =>
  k === "EP" ? "EP" : k === "soundcloud-set" ? "PROJECT" : "ALBUM";

async function main() {
  const catalog: Catalog = JSON.parse(readFileSync("prisma/seed-data/music.json", "utf8"));

  for (const [i, r] of catalog.releases.entries()) {
    const slug = slugify(r.title);
    const data = {
      title: r.title,
      kind: kindOf(r.kind),
      links: JSON.stringify(r.links),
      coverUrl: coverUrl(covers[r.title]),
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
