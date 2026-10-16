// Fills the LOCAL database with sample members and routes so the Cleanup Map has something on it.
//   npx tsx scripts/seed-cleanup-demo.ts          (refuses to run unless DATABASE_URL is on this machine)
// The streets are real: each route is asked of the same walking router the site uses, between intersections
// picked by hand. Sample rows are marked in their note and belong to @demo_ members, so they are easy to remove:
//   npx tsx scripts/seed-cleanup-demo.ts --remove
import "dotenv/config";
import { db } from "../src/lib/db";
import { HIDE_ENDS_M, lengthM, simplify, trimEnds, type LngLat } from "../src/lib/geo";
import { FOOT_ROUTER } from "../src/lib/map";

const host = new URL(process.env.DATABASE_URL ?? "postgres://none").hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  console.error(`Refusing to run: DATABASE_URL points at ${host}, not this machine.`);
  process.exit(1);
}

const SAMPLE = "Sample route for the concept page.";
const people = [
  { handle: "demo_ana", name: "Ana" },
  { handle: "demo_marcus", name: "Marcus" },
  { handle: "demo_priya", name: "Priya" },
  { handle: "demo_jo", name: "Jo" },
];

// [title, member, daysAgo, bags, waypoints as [lng, lat]]. Hand-picked intersections; the router joins them.
const walks: [string, number, number, number, LngLat[]][] = [
  ["Edgewater Park shoreline", 0, 2, 4, [[-81.7392, 41.4912], [-81.7421, 41.4887], [-81.7466, 41.4861], [-81.7514, 41.4839]]],
  ["Lakeview Cemetery fence line", 1, 6, 2, [[-81.6088, 41.5136], [-81.6041, 41.5107], [-81.6003, 41.5085], [-81.5969, 41.5062]]],
  ["Clark Ave to Wrigley, both sides", 2, 9, 6, [[-87.6553, 41.9484], [-87.6553, 41.9442], [-87.6619, 41.9442], [-87.6619, 41.9484]]],
  ["Tiergarten paths", 3, 14, 3, [[13.3541, 52.5143], [13.3598, 52.5151], [13.3672, 52.5139], [13.3716, 52.5127]]],
  ["Kamo River bank", 0, 21, 5, [[135.7695, 35.0118], [135.7706, 35.0067], [135.7713, 35.0012], [135.7721, 34.9962]]],
  ["Venice Beach to the pier", 1, 5, 7, [[-118.4730, 33.9850], [-118.4768, 33.9786], [-118.4806, 33.9726], [-118.4883, 33.9617]]],
  ["Harbourfront loop", 2, 11, 2, [[-79.3832, 43.6392], [-79.3772, 43.6384], [-79.3694, 43.6393], [-79.3645, 43.6413]]],
  ["Brooklyn Bridge Park", 3, 3, 3, [[-73.9967, 40.7019], [-73.9959, 40.6990], [-73.9972, 40.6954], [-74.0001, 40.6917]]],
];

// Walks no street map knows: drawn by hand, like freehand through a canyon or along a ridge.
const wild: [string, number, number, number, LngLat[]][] = [
  ["Bright Angel Trail, upper switchbacks", 1, 12, 1, [[-112.1436, 36.0571], [-112.1442, 36.0566], [-112.1431, 36.0559], [-112.1445, 36.0552], [-112.1433, 36.0545], [-112.1448, 36.0538], [-112.1436, 36.0530], [-112.1451, 36.0522], [-112.1440, 36.0514], [-112.1456, 36.0506], [-112.1447, 36.0497], [-112.1462, 36.0489], [-112.1452, 36.0481], [-112.1468, 36.0472]]],
  ["Skógafoss to the waterfall trail", 2, 30, 2, [[-19.5128, 63.5321], [-19.5140, 63.5338], [-19.5151, 63.5360], [-19.5149, 63.5388], [-19.5163, 63.5415], [-19.5181, 63.5436], [-19.5190, 63.5461]]],
];

async function walk(points: LngLat[]): Promise<LngLat[]> {
  const out: LngLat[] = [];
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const res = await fetch(`${FOOT_ROUTER}/${a[0]},${a[1]};${b[0]},${b[1]}?overview=full&geometries=geojson`);
    const j = (await res.json()) as { routes?: { geometry: { coordinates: LngLat[] } }[] };
    const path = j.routes?.[0]?.geometry.coordinates ?? [a, b];
    out.push(...(out.length ? path.slice(1) : path));
    await new Promise((r) => setTimeout(r, 1100)); // be polite to a free service
  }
  return out;
}

async function main() {
  const demo = await db.user.findMany({ where: { handle: { startsWith: "demo_" } }, select: { id: true } });
  await db.cleanup.deleteMany({ where: { authorId: { in: demo.map((u) => u.id) } } });
  if (process.argv.includes("--remove")) {
    await db.user.deleteMany({ where: { handle: { startsWith: "demo_" } } });
    console.log("Removed the sample members and their routes.");
    return;
  }
  const users = [];
  for (const p of people) {
    users.push(await db.user.upsert({ where: { handle: p.handle }, update: {}, create: { ...p, email: `${p.handle}@example.invalid`, role: "MEMBER" } }));
  }
  for (const [title, who, daysAgo, bags, pts] of [...walks, ...wild]) {
    const raw = wild.some((w) => w[0] === title) ? pts : await walk(pts);
    const cut = trimEnds(simplify(raw, 2), HIDE_ENDS_M) ?? simplify(raw, 2);
    const lngs = cut.map((p) => p[0]);
    const lats = cut.map((p) => p[1]);
    await db.cleanup.create({
      data: {
        authorId: users[who].id, title, note: SAMPLE, bags, route: cut, trimmedM: HIDE_ENDS_M,
        cleanedOn: new Date(Date.now() - daysAgo * 864e5), distanceM: Math.round(lengthM(cut)),
        minLng: Math.min(...lngs), maxLng: Math.max(...lngs), minLat: Math.min(...lats), maxLat: Math.max(...lats),
      },
    });
    console.log(`${title}: ${Math.round(lengthM(cut))} m, ${cut.length} points`);
  }
}
main().finally(() => db.$disconnect());
