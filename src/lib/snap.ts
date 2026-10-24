import "server-only";
import { decodePolyline6, type LngLat } from "@/lib/geo";
import { FOOT_ROUTER } from "@/lib/map";

// Street snapping for the drawing tool, done here on the server instead of in each visitor's browser. The free
// community routers (FOSSGIS) ask for: at most 1 request per second, an honest User-Agent that says who we are,
// and caching. This file does all three. It keeps its state in memory, which is right for a concept and for one
// server; on Vercel each warm instance has its own, which only makes it a little more polite, never less.

const VALHALLA = "https://valhalla1.openstreetmap.de/trace_route";
const USER_AGENT = `willkline.net-cleanup-map/1.0 (+https://willkline.net/cleanup${process.env.CONTACT_EMAIL ? `; ${process.env.CONTACT_EMAIL}` : ""})`;
const MIN_GAP_MS = 1100;

const cache = new Map<string, { at: number; line: LngLat[] }>();
const CACHE_MS = 24 * 3600_000;
const CACHE_MAX = 500;

// One lane for every call to the router, spaced out.
let lane: Promise<unknown> = Promise.resolve();
let lastCall = 0;
function inLane<T>(job: () => Promise<T>): Promise<T> {
  const run = lane.then(async () => {
    const wait = lastCall + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    return job();
  });
  lane = run.catch(() => undefined);
  return run;
}

function remember(key: string, line: LngLat[]) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(key, { at: Date.now(), line });
}

const hits = new Map<string, number[]>();
/** Each member gets `limit` snaps per minute. Returns false when they're over. */
export function allow(userId: string, limit = 40): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= limit) {
    hits.set(userId, recent);
    return false;
  }
  recent.push(now);
  hits.set(userId, recent);
  return true;
}

const r5 = (n: number) => Math.round(n * 1e5) / 1e5;

/** The walking route between two points (OSRM foot). Null if the router can't or won't. */
export async function walkBetween(a: LngLat, b: LngLat): Promise<LngLat[] | null> {
  const key = `w:${r5(a[0])},${r5(a[1])};${r5(b[0])},${r5(b[1])}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.line;
  const line = await inLane(async () => {
    try {
      const res = await fetch(`${FOOT_ROUTER}/${a[0]},${a[1]};${b[0]},${b[1]}?overview=full&geometries=geojson`, {
        headers: { "User-Agent": USER_AGENT, Referer: "https://willkline.net/cleanup" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const j = (await res.json()) as { routes?: { geometry: { coordinates: LngLat[] } }[] };
      const path = j.routes?.[0]?.geometry.coordinates;
      return path && path.length >= 2 ? path.map((c) => [c[0], c[1]] as LngLat) : null;
    } catch {
      return null;
    }
  });
  if (line) remember(key, line);
  return line;
}

/** A freehand line pulled onto the streets it follows (Valhalla map matching). Null if it isn't near any. */
export async function matchToStreets(shape: LngLat[]): Promise<LngLat[] | null> {
  const key = `m:${shape.map((p) => `${r5(p[0])},${r5(p[1])}`).join(";")}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.line;
  const line = await inLane(async () => {
    try {
      const res = await fetch(VALHALLA, {
        method: "POST",
        headers: { "User-Agent": USER_AGENT, Referer: "https://willkline.net/cleanup", "Content-Type": "application/json" },
        body: JSON.stringify({ shape: shape.map(([lon, lat]) => ({ lat, lon })), costing: "pedestrian", shape_match: "map_snap" }),
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) return null;
      const j = (await res.json()) as { trip?: { legs?: { shape: string }[] } };
      const legs = j.trip?.legs ?? [];
      const out = legs.flatMap((l, i) => (i === 0 ? decodePolyline6(l.shape) : decodePolyline6(l.shape).slice(1)));
      return out.length >= 2 ? out : null;
    } catch {
      return null;
    }
  });
  if (line) remember(key, line);
  return line;
}
