// Candidate visual directions for "normal mode" (see docs/DESIGN.md).
// Preview any of them with ?theme=<id>. Once Will picks one, it becomes the
// default and the others can be deleted.

export const themes = [
  { id: "recital", name: "Recital Program", note: "Cream paper, Garamond, burgundy ink. Classic concert-program feel." },
  { id: "homepage", name: "Self-Hosted '07", note: "Fixed-width page, Georgia + Verdana, bordered boxes, blue links. Lovingly old-web." },
  { id: "studio", name: "Quiet Studio", note: "Modern and minimal. White space, crisp sans-serif, one accent color." },
] as const;

export type ThemeId = (typeof themes)[number]["id"];
export const DEFAULT_THEME: ThemeId = "recital";
