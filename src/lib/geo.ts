// Distances, privacy trimming and clean-up of a drawn route. Pure functions on [lng, lat] pairs so
// they can be tested without a map or a database (scripts/test_geo.ts).

export type LngLat = [number, number];

const EARTH_M = 6_371_008.8;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. Plenty accurate for walks (error well under 1 %). */
export function haversineM(a: LngLat, b: LngLat): number {
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function lengthM(line: readonly LngLat[]): number {
  let total = 0;
  for (let i = 1; i < line.length; i++) total += haversineM(line[i - 1], line[i]);
  return total;
}

export const metersToMiles = (m: number) => m / 1609.344;
export const metersToKm = (m: number) => m / 1000;

/** The point `fraction` (0 to 1) of the way from a to b (a straight line in lng/lat: fine over a few metres). */
function lerp(a: LngLat, b: LngLat, fraction: number): LngLat {
  return [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction];
}

/** The part of the line that starts `from` metres along it and ends `to` metres along it. */
export function slice(line: readonly LngLat[], from: number, to: number): LngLat[] {
  const out: LngLat[] = [];
  let walked = 0;
  for (let i = 1; i < line.length && walked < to; i++) {
    const a = line[i - 1];
    const b = line[i];
    const seg = haversineM(a, b);
    const end = walked + seg;
    if (end > from && seg > 0) {
      const start = Math.max(from, walked);
      const stop = Math.min(to, end);
      if (out.length === 0) out.push(lerp(a, b, (start - walked) / seg));
      out.push(lerp(a, b, (stop - walked) / seg));
    }
    walked = end;
  }
  return out;
}

/**
 * Hide where a walk began and ended: cut `meters` off both ends. People start from their own door, so
 * publishing the exact start would publish their home. Returns null when the route is too short to cut
 * without leaving almost nothing (the caller then says so and lets the person choose).
 */
export function trimEnds(line: readonly LngLat[], meters: number): LngLat[] | null {
  const total = lengthM(line);
  if (meters <= 0) return [...line];
  if (total < meters * 2 + 100) return null;
  const cut = slice(line, meters, total - meters);
  return cut.length >= 2 ? cut : null;
}

/** Perpendicular distance in metres from p to the segment a-b (local flat approximation). */
function offSegmentM(p: LngLat, a: LngLat, b: LngLat): number {
  const k = Math.cos(rad(a[1]));
  const px = (p[0] - a[0]) * k;
  const py = p[1] - a[1];
  const bx = (b[0] - a[0]) * k;
  const by = b[1] - a[1];
  const len2 = bx * bx + by * by;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / len2));
  const dx = px - t * bx;
  const dy = py - t * by;
  return Math.hypot(dx, dy) * (Math.PI / 180) * EARTH_M;
}

/** Douglas-Peucker: drop points that sit within `toleranceM` of the line between their neighbours. */
export function simplify(line: readonly LngLat[], toleranceM: number): LngLat[] {
  if (line.length <= 2) return [...line];
  const keep = new Array<boolean>(line.length).fill(false);
  keep[0] = keep[line.length - 1] = true;
  const stack: [number, number][] = [[0, line.length - 1]];
  while (stack.length) {
    const [lo, hi] = stack.pop()!;
    let worst = 0;
    let at = -1;
    for (let i = lo + 1; i < hi; i++) {
      const d = offSegmentM(line[i], line[lo], line[hi]);
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (at >= 0 && worst > toleranceM) {
      keep[at] = true;
      stack.push([lo, at], [at, hi]);
    }
  }
  return line.filter((_, i) => keep[i]);
}

/** How much of each end of a route is hidden by default (a few city blocks). */
export const HIDE_ENDS_M = 200;

export const LIMITS = {
  /** Points a route may have once simplified. */
  points: 3000,
  /** The longest single clean-up we believe (a long-distance trail day is well under this). */
  meters: 80_000,
} as const;

/** Is this a route we can store? Says why not, in words a person can act on. */
export function checkRoute(line: unknown): { ok: true; line: LngLat[] } | { ok: false; message: string } {
  if (!Array.isArray(line) || line.length < 2) return { ok: false, message: "Draw at least two points." };
  if (line.length > LIMITS.points * 4) return { ok: false, message: "That route has too many points." };
  const clean: LngLat[] = [];
  for (const p of line) {
    if (!Array.isArray(p) || p.length < 2 || typeof p[0] !== "number" || typeof p[1] !== "number")
      return { ok: false, message: "The route is not valid." };
    const [lng, lat] = p;
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 85.06)
      return { ok: false, message: "The route has a point that is not on Earth." };
    clean.push([Math.round(lng * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6]);
  }
  const simple = simplify(clean, 2);
  if (simple.length > LIMITS.points) return { ok: false, message: "That route is too detailed. Draw it in fewer, longer pieces." };
  if (lengthM(simple) > LIMITS.meters)
    return { ok: false, message: `That is over ${LIMITS.meters / 1000} km. Log a long day as a few clean-ups.` };
  return { ok: true, line: simple };
}

/** "3.2 mi" / "0.4 mi" / "12 mi": the unit people say out loud; km alongside where it helps. */
export function formatMiles(m: number): string {
  const mi = metersToMiles(m);
  return `${mi >= 10 ? Math.round(mi) : mi >= 0.1 ? mi.toFixed(1) : mi.toFixed(2)} mi`;
}
export function formatKm(m: number): string {
  const km = metersToKm(m);
  return `${km >= 10 ? Math.round(km) : km.toFixed(1)} km`;
}

/** Decode a Valhalla "encoded polyline" (precision 6) into [lng, lat] pairs. */
export function decodePolyline6(encoded: string): LngLat[] {
  const out: LngLat[] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  const next = () => {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && i <= encoded.length);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < encoded.length) {
    lat += next();
    lng += next();
    out.push([lng / 1e6, lat / 1e6]);
  }
  return out;
}
