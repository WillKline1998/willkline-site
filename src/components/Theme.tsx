"use client";

// The theme service (client half). The current theme is data-theme on <html>; every look lives in CSS under
// html[data-theme="..."] (see globals.css), so pages never branch on the theme. Registry: src/lib/themes.ts.
//
// Precedence: the visitor's own choice (localStorage, set by the cycler) > the admin default (SiteSetting,
// rendered into the HTML by the root layout). A boot script in <head> applies the stored choice before first
// paint; useSyncExternalStore keeps server render and hydration in agreement (server snapshot = no choice).

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_THEME,
  LEGACY_DEMO_KEY,
  THEME_STORAGE_KEY,
  isThemeId,
  nextTheme,
  themeName,
  type ThemeId,
} from "@/lib/themes";

type Ctx = { theme: ThemeId; cycle: () => void };
const ThemeContext = createContext<Ctx>({ theme: DEFAULT_THEME, cycle: () => {} });

const EVENT = "wk-theme-change";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange); // sync across tabs
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
function getSnapshot(): ThemeId | null {
  const s = localStorage.getItem(THEME_STORAGE_KEY);
  if (isThemeId(s)) return s;
  return localStorage.getItem(LEGACY_DEMO_KEY) === "on" ? "demo" : null;
}
const getServerSnapshot = () => null;

export function ThemeProvider({ defaultTheme, children }: { defaultTheme: ThemeId; children: React.ReactNode }) {
  const chosen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const theme = chosen ?? defaultTheme;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const cycle = useCallback(() => {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme(theme));
    localStorage.removeItem(LEGACY_DEMO_KEY);
    window.dispatchEvent(new Event(EVENT));
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, cycle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** For the demo-mode effects in components (sparkle cursor, bouncing shapes, artist bubbles). */
export function useDemoMode() {
  return { demo: useTheme().theme === "demo" };
}

/** The sidebar button: shows the current theme; each press advances to the next one. */
export function ThemeCycler() {
  const { theme, cycle } = useTheme();
  const name = themeName(theme);
  const next = themeName(nextTheme(theme));
  return (
    <button
      type="button"
      onClick={cycle}
      className="theme-cycler"
      data-current={theme}
      aria-label={`Theme: ${name}. Switch to ${next}`}
      title={`Next: ${next}`}
    >
      <span className="theme-cycler-label">Theme</span>
      <span className="theme-cycler-name">{name}</span>
      <span className="theme-cycler-icon" aria-hidden="true">↻</span>
    </button>
  );
}
