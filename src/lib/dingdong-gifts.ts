import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

// A visitor's daily key: sha256(IP + New York date + secret). It changes every day, so it can't be used to
// follow anyone around, and the raw IP is never stored. DINGDONG_SALT is a Vercel env var; locally any value works.
export function visitorHash(ip: string, now = new Date()) {
  const day = now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const salt = process.env.DINGDONG_SALT || process.env.DATABASE_URL || "dingdong";
  return createHash("sha256").update(`${ip}|${day}|${salt}`).digest("hex");
}

export function clientIp(h: Headers) {
  return h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/** What the page shows: the trough (pending + granted asks) and how many gifts are waiting. Never throws. */
export async function dingDongWantsAndGifts() {
  try {
    const [wants, waiting] = await Promise.all([
      db.dingDongWant.findMany({
        where: { status: { in: ["pending", "granted"] } },
        orderBy: [{ status: "desc" }, { createdAt: "desc" }],
        take: 12,
      }),
      db.dingDongGift.count({ where: { status: "pending" } }),
    ]);
    return { wants, waiting };
  } catch (e) {
    console.error("dingdong: wants/gifts read failed", e);
    return { wants: [], waiting: 0 };
  }
}
