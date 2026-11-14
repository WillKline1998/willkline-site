// The words visitors may give DingDong. The list itself lives in dingdong-vocabulary.json (edit that file;
// the 9 AM engine reads the same file). Shared by the gift box (client) and the server action.
import raw from "./dingdong-vocabulary.json";

export const VOCAB_GROUPS = [
  { key: "instruments", label: "Instruments" },
  { key: "sounds", label: "Sounds" },
  { key: "moods", label: "Moods" },
  { key: "genres", label: "Genres" },
] as const;
export type VocabGroup = (typeof VOCAB_GROUPS)[number]["key"];

const WORD = /^[a-z][a-z -]{1,23}$/;
export const VOCAB: Record<VocabGroup, string[]> = Object.fromEntries(
  VOCAB_GROUPS.map(({ key }) => [key, ((raw as Record<string, unknown>)[key] as string[] | undefined)?.filter((w) => WORD.test(w)) ?? []]),
) as Record<VocabGroup, string[]>;
export const VOCAB_SET = new Set(Object.values(VOCAB).flat());

export const GIFT_LIMITS = { wordsPerGift: 3, giftsPerVisitorPerDay: 3, giftsPerDayAll: 400 };

/** Returns the gift's words (deduped, allow-listed, 1-3) or an error. Anything outside the list is refused. */
export function readGiftWords(input: unknown[]): { words: string[]; error?: undefined } | { words?: undefined; error: string } {
  const words = [...new Set(input.map((v) => (typeof v === "string" ? v.trim().toLowerCase() : "")))].filter(Boolean);
  if (!words.length) return { error: "Pick a word first." };
  if (words.length > GIFT_LIMITS.wordsPerGift) return { error: `Up to ${GIFT_LIMITS.wordsPerGift} words at a time. He's small.` };
  if (!words.every((w) => VOCAB_SET.has(w))) return { error: "DingDong only knows the words on the list." };
  return { words };
}
