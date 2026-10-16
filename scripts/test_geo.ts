// Run: npx tsx --test scripts/test_geo.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkRoute, haversineM, lengthM, metersToMiles, simplify, slice, trimEnds, formatMiles, type LngLat } from "../src/lib/geo";

// A straight walk due north from the equator: 0.001 degrees of latitude is 111.195 m.
const north = (n: number): LngLat[] => Array.from({ length: n + 1 }, (_, i) => [0, i * 0.001]);

test("a degree of latitude is about 111.2 km and a mile is 1609.344 m", () => {
  assert.ok(Math.abs(haversineM([0, 0], [0, 1]) - 111_195) < 50);
  assert.ok(Math.abs(metersToMiles(1609.344) - 1) < 1e-12);
});

test("length adds the pieces", () => {
  assert.ok(Math.abs(lengthM(north(10)) - 1111.95) < 1);
  assert.equal(lengthM([[0, 0]]), 0);
});

test("slice returns exactly the part asked for", () => {
  const piece = slice(north(10), 200, 700);
  assert.ok(Math.abs(lengthM(piece) - 500) < 1);
  assert.ok(Math.abs(haversineM(piece[0], [0, 0]) - 200) < 1);
});

test("trimming removes the start and the end, so the real door is not on the map", () => {
  const route = north(40); // about 4.4 km
  const cut = trimEnds(route, 200)!;
  assert.ok(Math.abs(lengthM(cut) - (lengthM(route) - 400)) < 2);
  assert.ok(haversineM(cut[0], route[0]) > 199);
  assert.ok(haversineM(cut[cut.length - 1], route[route.length - 1]) > 199);
});

test("a route too short to hide its ends says so instead of leaving a stub", () => {
  assert.equal(trimEnds(north(3), 200), null);
  assert.deepEqual(trimEnds(north(3), 0), north(3));
});

test("simplify keeps corners and drops points on a straight line", () => {
  const dogleg: LngLat[] = [[0, 0], [0, 0.0005], [0, 0.001], [0.001, 0.001], [0.002, 0.001]];
  const s = simplify(dogleg, 3);
  assert.deepEqual(s, [[0, 0], [0, 0.001], [0.002, 0.001]]);
});

test("checkRoute accepts a walk, rounds it, and refuses nonsense in words", () => {
  const ok = checkRoute([[-81.690123456, 41.4993], [-81.69, 41.5]]);
  assert.equal(ok.ok, true);
  if (ok.ok) assert.deepEqual(ok.line[0], [-81.690123, 41.4993]);
  for (const bad of [null, [[0, 0]], [[0, 0], ["a", 1]], [[0, 0], [200, 1]], [[0, 0], [0, 90]], [[0, 0], [NaN, 1]]]) {
    const r = checkRoute(bad);
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.message.length > 5);
  }
  const huge = checkRoute([[0, 0], [0, 1]]); // 111 km
  assert.equal(huge.ok, false);
});

test("miles read the way people say them", () => {
  assert.equal(formatMiles(1609.344), "1.0 mi");
  assert.equal(formatMiles(160), "0.10 mi");
  assert.equal(formatMiles(32_187), "20 mi");
});
