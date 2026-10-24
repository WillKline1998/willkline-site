// One-off: adds the "coming soon" Woodshed card to the Lab. Safe to re-run (does nothing if it exists).
import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  const slug = "woodshed";
  if (await db.labProject.findUnique({ where: { slug } })) return console.log("Woodshed is already in the Lab.");
  const last = await db.labProject.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  await db.labProject.create({
    data: {
      slug,
      title: "Woodshed",
      status: "BUILDING",
      description: "Coming soon: a practice partner for musicians. It keeps time, listens along, and helps you get the hard bar right.",
      body: "## Coming soon\n\nWoodshed is a music practice partner, built for the hours between lessons and gigs.\n\nMore here when it's ready to play with.\n",
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
  console.log("Added Woodshed to the Lab.");
}
main().finally(() => db.$disconnect());
