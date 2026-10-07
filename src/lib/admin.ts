import { notFound } from "next/navigation";

// TEMPORARY gate until real login lands (M3): admin pages and actions only
// work on Will's machine (dev / local `next start` with ADMIN_LOCAL=1).
// In any other environment they 404, so nothing is exposed when deployed.
export function adminEnabled() {
  return process.env.NODE_ENV === "development" || process.env.ADMIN_LOCAL === "1";
}

export function requireAdmin() {
  if (!adminEnabled()) notFound();
}
