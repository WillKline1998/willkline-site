// DingDong: shared types and the tolerant pattern reader. The page never trusts stored JSON:
// anything malformed becomes `null` and the day still shows its diary, just without a Play button.

export type DingNote = { beat: number; pitch: string; dur: number };
export type DingPattern = { tempo: number; beats: number; instrument: string; notes: DingNote[] };

const PITCH = /^[A-G](#|b)?[0-8]$/;
const INSTRUMENTS = ["basic", "bell", "soft", "buzzy"];

const num = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;

export function readPattern(raw: unknown): DingPattern | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const p = raw as Record<string, unknown>;
  if (!Array.isArray(p.notes)) return null;
  const beats = Math.round(num(p.beats, 1, 32, 8));
  const notes: DingNote[] = [];
  for (const n of p.notes.slice(0, 64)) {
    if (!n || typeof n !== "object") continue;
    const o = n as Record<string, unknown>;
    if (typeof o.beat !== "number" || !Number.isFinite(o.beat) || o.beat < 0 || o.beat >= beats) continue;
    const pitch = typeof o.pitch === "string" && PITCH.test(o.pitch) ? o.pitch : "C5";
    notes.push({ beat: o.beat, pitch, dur: num(o.dur, 0.1, 8, 0.5) });
  }
  if (!notes.length) return null;
  notes.sort((a, b) => a.beat - b.beat);
  const instrument = typeof p.instrument === "string" && INSTRUMENTS.includes(p.instrument) ? p.instrument : "basic";
  return { tempo: num(p.tempo, 40, 200, 70), beats, instrument, notes };
}

// What each ear stage means, in plain words for visitors.
export const STAGE_BLURBS: Record<string, string> = {
  pulse: "He can only hear when a ding happens. One sound, no high or low yet.",
  pitch: "He can hear high and low now, up to three different dings.",
  intervals: "He can hear how far apart two dings are: small steps versus big jumps.",
  rhythm: "He has learned that dings can be long or short.",
  scales: "He keeps his dings inside one scale.",
  chords: "He can stack dings on the same beat.",
  form: "He thinks in sections now, a first part and a second part.",
  instruments: "He has found other sounds besides the plain ding.",
  genre: "His ears are all grown up. Anything goes.",
};

// Which of the owner's face drawings (public/dingdong/dingdong-<face>.svg) DingDong wears in the studio.
export const FACES = ["happy", "sad", "angry", "confused", "disgusted", "scared", "surprised", "neutral", "singing"] as const;
export type Face = (typeof FACES)[number];
export type StudioMood = { face: Face; asleep: boolean; why: string };

// The resting mood for the newest day. Deliberately tiny and deterministic (docs/RESEARCH-dingdong-studio.md):
//   no day / broken tune / a "sleepy" fallback day -> asleep (neutral face, no wandering, no sound)
//   likedIt true -> happy · likedIt false -> confused · likedIt unknown -> neutral
// "singing" is never stored: the studio puts it on only while his tune is actually playing.
// Hook for later: if the cron starts writing a `mood` field, map it here and nowhere else.
export function studioMood(day: { likedIt: boolean | null; fallback: boolean } | null | undefined, hasTune: boolean): StudioMood {
  if (!day || !hasTune || day.fallback) return { face: "neutral", asleep: true, why: "no tune today" };
  if (day.likedIt === true) return { face: "happy", asleep: false, why: "he liked what he made" };
  if (day.likedIt === false) return { face: "confused", asleep: false, why: "he isn't sure about it" };
  return { face: "neutral", asleep: false, why: "no feelings logged" };
}
