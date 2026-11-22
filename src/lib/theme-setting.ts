import { getSetting } from "@/lib/settings";
import { DEFAULT_THEME, DEFAULT_THEME_SETTING, isThemeId, type ThemeId } from "@/lib/themes";

/** The theme anyone without their own choice sees (admin-set in /admin/theme; pop art until changed). */
export async function getDefaultTheme(): Promise<ThemeId> {
  try {
    const v = await getSetting(DEFAULT_THEME_SETTING, DEFAULT_THEME);
    return isThemeId(v) ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME; // a settings read must never take the whole site down
  }
}
