"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { str } from "@/lib/forms";
import { DEFAULT_THEME_SETTING, isThemeId } from "@/lib/themes";

export async function setDefaultTheme(form: FormData) {
  await requireAdmin("/admin/theme");
  const value = str(form, "theme");
  if (!isThemeId(value)) redirect("/admin/theme?error=1");
  await db.siteSetting.upsert({ where: { key: DEFAULT_THEME_SETTING }, update: { value }, create: { key: DEFAULT_THEME_SETTING, value } });
  // The root layout renders the default into every page's <html>: invalidate the whole site, on purpose.
  revalidatePath("/", "layout");
  redirect("/admin/theme?saved=1");
}
