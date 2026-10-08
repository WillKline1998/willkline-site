"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getJsonSetting } from "@/lib/settings";
import type { Cv, CvEntry } from "@/lib/cv";

// The friendly CV form posts flat fields (exp.0.title, edu.1.school, …).
// Lists are one item per line; skills are "Label: value" lines.

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Indices present for a prefix, ordered by their "order" field; removed rows dropped. */
function rows(f: FormData, prefix: string) {
  const ids = new Set<number>();
  for (const k of f.keys()) {
    const m = k.match(new RegExp(`^${prefix}\\.(\\d+)\\.`));
    if (m) ids.add(Number(m[1]));
  }
  return [...ids]
    .filter((i) => f.get(`${prefix}.${i}.remove`) !== "on")
    .sort((a, b) => Number(s(f, `${prefix}.${a}.order`) || a) - Number(s(f, `${prefix}.${b}.order`) || b));
}

export async function saveCvForm(form: FormData) {
  await requireAdmin("/admin/cv");
  const current = await getJsonSetting<Cv | null>("cv", null);

  const experience: CvEntry[] = rows(form, "exp").map((i) => ({
    title: s(form, `exp.${i}.title`),
    org: s(form, `exp.${i}.org`),
    location: s(form, `exp.${i}.location`),
    dates: s(form, `exp.${i}.dates`),
    ...(s(form, `exp.${i}.note`) ? { note: s(form, `exp.${i}.note`) } : {}),
    bullets: lines(form.get(`exp.${i}.bullets`)),
  }));
  const education = rows(form, "edu").map((i) => ({
    school: s(form, `edu.${i}.school`),
    detail: s(form, `edu.${i}.detail`),
    location: s(form, `edu.${i}.location`),
    dates: s(form, `edu.${i}.dates`),
  }));

  const intent = s(form, "intent");
  if (intent === "add-exp") experience.push({ title: "", org: "", location: "", dates: "", bullets: [] });
  if (intent === "add-edu") education.push({ school: "", detail: "", location: "", dates: "" });

  const cv: Cv = {
    name: current?.name ?? "Will Kline",
    contact: lines(form.get("contact")),
    summary: s(form, "summary"),
    experience,
    additional_experience: s(form, "additional_experience") || undefined,
    music: lines(form.get("music")),
    education,
    skills: lines(form.get("skills")).map((l) => {
      const at = l.indexOf(":");
      return (at > 0 ? [l.slice(0, at).trim(), l.slice(at + 1).trim()] : ["", l]) as [string, string];
    }),
  };
  await db.siteSetting.upsert({ where: { key: "cv" }, update: { value: JSON.stringify(cv, null, 2) }, create: { key: "cv", value: JSON.stringify(cv, null, 2) } });
  revalidatePath("/cv");
  redirect(intent ? `/admin/cv#${intent === "add-exp" ? "experience" : "education"}` : "/admin/cv?saved=1");
}
