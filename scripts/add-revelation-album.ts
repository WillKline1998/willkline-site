// One-off: adds (or refreshes) REVELATION on /music as a coming-soon album. Safe to re-run.
// Re-running resets the title and track list (titles only; drops durations) to what's below, but never touches coverUrl, links,
// year, liner notes or order once the album exists, so a real cover / links set later survive.
// On release day: set coverUrl + links, untick "coming soon" in /admin/music (durations via the track-list editor).
import "dotenv/config";
import { db } from "../src/lib/db";

const slug = "revelation";
const title = "REVELATION";
const tracks = [
  "Finally Something",
  "Viscera",
  "Maintenance",
  "New Car",
  "How am I not myself?",
  "Leave Me Alone",
  "7 Trumpets",
  "America",
  "Good Thing Goin' On",
  "Revelation",
];

async function main() {
  let album = await db.album.findUnique({ where: { slug } });
  if (album) {
    album = await db.album.update({ where: { slug }, data: { title } });
    console.log("Updated REVELATION.");
  } else {
    // Newest first: sort ahead of everything already on /music.
    const first = await db.album.findFirst({ orderBy: { sortOrder: "asc" }, select: { sortOrder: true } });
    album = await db.album.create({
      data: { slug, title, kind: "ALBUM", comingSoon: true, published: true, sortOrder: (first?.sortOrder ?? 1) - 1 },
    });
    console.log("Added REVELATION to Music.");
  }
  await db.$transaction([
    db.track.deleteMany({ where: { albumId: album.id } }),
    db.track.createMany({ data: tracks.map((t, i) => ({ albumId: album.id, title: t, position: i + 1 })) }),
  ]);
  console.log(`Track list: ${tracks.length} titles.`);
}
main().finally(() => db.$disconnect());
