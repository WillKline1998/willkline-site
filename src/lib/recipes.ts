// Rules for recipes, shared by the form (to show limits) and the Server Actions (to enforce them).

export const RECIPE_LIMITS = {
  perDay: 10,
  name: 100,
  description: 1500,
  ingredients: 60,
  ingredient: 200,
  steps: 40,
  step: 2000,
  tags: 6,
  tag: 24,
  sourceText: 200,
} as const;

/**
 * "Indian, Vegan; weeknight  " -> ["indian", "vegan", "weeknight"]. Lower-cased, trimmed, inner spaces
 * collapsed, de-duplicated, capped. Anyone can invent a tag; this keeps "Vegan" and "vegan " the same one.
 */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(/[,;\n]+/)) {
    const tag = part.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, " ").slice(0, RECIPE_LIMITS.tag).trim();
    if (tag) seen.add(tag);
  }
  return [...seen].slice(0, RECIPE_LIMITS.tags);
}

/** Non-empty trimmed lines, each cut to `max` characters. */
export function cleanLines(values: string[], max: number): string[] {
  return values.map((v) => v.trim().slice(0, max)).filter(Boolean);
}

export const TAG_SUGGESTIONS = ["vegan", "vegetarian", "indian", "meal prep", "dessert", "quick", "breakfast", "high protein"];

/** "any": show recipes with at least one of the chosen tags. "all": only those with every one. */
export type TagMatch = "any" | "all";
