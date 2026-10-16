import "server-only";
import { db } from "@/lib/db";
import type { LngLat } from "@/lib/geo";

export const CLEANUP_LIMITS = { title: 80, note: 400, bags: 500, perDay: 5 } as const;
const visible = { hidden: false } as const;
/** What may be drawn or listed: not hidden by a moderator, and not a private entry. */
const drawable = { hidden: false, isPrivate: false } as const;

/** What a person is called on the map: their @handle, else their name, never their email. */
export const displayName = (u: { handle: string | null; name: string | null }) =>
  u.handle ? `@${u.handle}` : u.name || "A member";

export type CommunityStats = { meters: number; cleanups: number; members: number; bags: number };

/** Totals for the headline numbers. Counts every clean-up a moderator has not hidden, private ones included (they add to the miles, never to the map). */
export async function communityStats(): Promise<CommunityStats> {
  const [sum, members] = await Promise.all([
    db.cleanup.aggregate({ where: visible, _sum: { distanceM: true, bags: true }, _count: true }),
    db.cleanup.groupBy({ by: ["authorId"], where: visible }),
  ]);
  return { meters: sum._sum.distanceM ?? 0, bags: sum._sum.bags ?? 0, cleanups: sum._count, members: members.length };
}

export async function recentCleanups(take = 12) {
  return db.cleanup.findMany({
    where: drawable,
    orderBy: { cleanedOn: "desc" },
    take,
    select: {
      id: true, title: true, note: true, cleanedOn: true, distanceM: true, bags: true,
      minLng: true, minLat: true, maxLng: true, maxLat: true,
      author: { select: { handle: true, name: true } },
    },
  });
}

/** Everything the map draws: one GeoJSON line per clean-up, with just what the popup shows. */
export async function routeFeatures() {
  const rows = await db.cleanup.findMany({
    where: drawable,
    orderBy: { createdAt: "desc" },
    take: 2000,
    select: { id: true, title: true, cleanedOn: true, distanceM: true, bags: true, route: true, author: { select: { handle: true, name: true } } },
  });
  return {
    type: "FeatureCollection" as const,
    features: rows.map((c) => ({
      type: "Feature" as const,
      properties: { id: c.id, title: c.title, by: displayName(c.author), on: c.cleanedOn.toISOString().slice(0, 10), meters: c.distanceM, bags: c.bags },
      geometry: { type: "LineString" as const, coordinates: c.route as LngLat[] },
    })),
  };
}

/** A member's own clean-ups, private ones included, for the "Your clean-ups" page. */
export async function myCleanups(userId: string) {
  return db.cleanup.findMany({
    where: { authorId: userId },
    orderBy: { cleanedOn: "desc" },
    select: { id: true, title: true, cleanedOn: true, distanceM: true, bags: true, isPrivate: true, hidden: true },
  });
}
