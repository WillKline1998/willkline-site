// One-off: adds (or refreshes) the polymetric sequencer card in the Lab. Safe to re-run; edit the text here and
// re-run to update the entry as the project grows (the Lab card is a snapshot, not a changelog).
// The name is lowercase on purpose (no product name yet). No live link: nothing is public yet.
import "dotenv/config";
import { db } from "../src/lib/db";

const entry = {
  title: "polymetric sequencer",
  status: "BUILDING",
  description: "A Max/MSP app for sequencing polymeters. That's all we're saying for now.",
  body: `## Not much to see yet

Every track keeps its own time. The music is what happens where they disagree.

More here when it's ready to play with.
`,
  tech: "Max/MSP",
  url: null,
};

async function main() {
  const slug = "polymetric-sequencer";
  if (await db.labProject.findUnique({ where: { slug } })) {
    await db.labProject.update({ where: { slug }, data: entry });
    return console.log("Updated the polymetric sequencer in the Lab.");
  }
  const last = await db.labProject.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  await db.labProject.create({ data: { slug, ...entry, sortOrder: (last?.sortOrder ?? 0) + 1 } });
  console.log("Added the polymetric sequencer to the Lab.");
}
main().finally(() => db.$disconnect());
