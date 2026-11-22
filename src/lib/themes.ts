// The theme service's registry. A theme is: an id (the value of data-theme on <html>), a display name, and
// one CSS block in globals.css scoped to html[data-theme="<id>"]. The cycler button walks THEMES in order.
//
// The CSS foundation (everything in globals.css that isn't theme-scoped) IS the site's first look, so
// "Original Design" needs no block of its own; pop art and demo mode are each a scoped layer over it.
// Adding a theme: add an entry here + its html[data-theme="<id>"] block. Nothing else.

export const THEMES = [
  { id: "pop-art", name: "pop art", note: "Bauhaus Pop: paper, poster colour blocks, hard black rules (Nov 2026)" },
  { id: "demo", name: "demo mode", note: "The psychedelic layer: molten orange, drifting shapes, sparkle cursor" },
  { id: "original", name: "Original Design", note: "The site's first look, kept to commemorate it (Oct 2026)" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "pop-art";
/** Visitor's own choice (set by the cycler). Wins over the admin default. */
export const THEME_STORAGE_KEY = "wk-theme";
/** Pre-theme-service demo toggle; "on" is honoured as a choice of demo mode. */
export const LEGACY_DEMO_KEY = "wk-demo-mode";
/** SiteSetting row holding the admin's default theme (for anyone who hasn't chosen one). */
export const DEFAULT_THEME_SETTING = "default_theme";

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === "string" && THEMES.some((t) => t.id === v);
}

export function themeName(id: ThemeId): string {
  return THEMES.find((t) => t.id === id)!.name;
}

export function nextTheme(id: ThemeId): ThemeId {
  const i = THEMES.findIndex((t) => t.id === id);
  return THEMES[(i + 1) % THEMES.length].id;
}

/**
 * Inline, render-blocking script for <head>: applies the visitor's stored theme before first paint, so a
 * chosen theme never flashes the default. Keep it tiny and dependency-free (it's stringified).
 */
export function themeBootScript(): string {
  const ids = JSON.stringify(THEMES.map((t) => t.id));
  return `try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(${ids}.indexOf(s)<0)s=localStorage.getItem(${JSON.stringify(LEGACY_DEMO_KEY)})==="on"?"demo":null;if(s)document.documentElement.dataset.theme=s}catch(e){}`;
}
