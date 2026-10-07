import { db } from "@/lib/db";

// Editable site text lives in SiteSetting rows (admin-editable in M3),
// so changing the bio or CV never requires a redeploy.
export async function getSetting(key: string, fallback = ""): Promise<string> {
  const row = await db.siteSetting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export async function getJsonSetting<T>(key: string, fallback: T): Promise<T> {
  const raw = await getSetting(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
