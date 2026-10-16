import { currentUser } from "@/lib/auth";
import { LIMITS, simplify, type LngLat } from "@/lib/geo";
import { allow, matchToStreets, walkBetween } from "@/lib/snap";

// POST { kind: "walk", from, to }  -> the walking route between two points
// POST { kind: "match", shape }    -> a freehand line snapped to the streets it follows
// Members only, a few per minute each, because the free routers behind it are shared community services.

const point = (p: unknown): LngLat | null =>
  Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number" && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 85 ? [p[0], p[1]] : null;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Log in to draw." }, { status: 401 });
  if (!allow(user.id)) return Response.json({ error: "Easy there: too many snaps in a minute. Wait a few seconds." }, { status: 429 });

  let body: { kind?: string; from?: unknown; to?: unknown; shape?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  if (body.kind === "walk") {
    const a = point(body.from);
    const b = point(body.to);
    if (!a || !b) return Response.json({ error: "Bad points." }, { status: 400 });
    const line = await walkBetween(a, b);
    return line ? Response.json({ line }) : Response.json({ error: "No street route found." }, { status: 502 });
  }

  if (body.kind === "match") {
    const raw = Array.isArray(body.shape) ? body.shape.map(point) : [];
    if (raw.length < 2 || raw.length > LIMITS.points || raw.some((p) => !p)) return Response.json({ error: "Bad shape." }, { status: 400 });
    // Map matching wants a modest number of points; a freehand stroke has far more than it needs.
    let shape = simplify(raw as LngLat[], 3);
    if (shape.length > 400) shape = simplify(shape, 10);
    const line = await matchToStreets(shape);
    return line ? Response.json({ line }) : Response.json({ error: "That didn't line up with any streets." }, { status: 502 });
  }

  return Response.json({ error: "Bad request." }, { status: 400 });
}
