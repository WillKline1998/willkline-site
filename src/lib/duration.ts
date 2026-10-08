// Track durations: stored as seconds, shown and typed as m:ss (or h:mm:ss).

export function formatDuration(sec: number | null | undefined) {
  if (sec == null) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** "3:25" → 205, "1:02:03" → 3723, "" → null; anything else → NaN (invalid). */
export function parseDuration(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  if (!/^\d{1,3}(:[0-5]\d){1,2}$/.test(t)) return NaN;
  return t.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
}
