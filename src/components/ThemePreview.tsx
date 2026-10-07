"use client";

// Lets Will compare design directions: /?theme=homepage etc.
// The choice sticks (localStorage) until changed. Temporary: removed once a
// direction is chosen.

import { useEffect } from "react";
import { DEFAULT_THEME, themes } from "@/lib/themes";

const KEY = "wk-theme";

export function ThemePreview() {
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("theme");
    const valid = (t: string | null) => !!t && themes.some((x) => x.id === t);
    if (valid(fromUrl)) localStorage.setItem(KEY, fromUrl!);
    const stored = localStorage.getItem(KEY);
    document.documentElement.dataset.theme = valid(stored) ? stored! : DEFAULT_THEME;
  }, []);
  return null;
}
