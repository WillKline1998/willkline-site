import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getDefaultTheme } from "@/lib/theme-setting";
import { THEMES } from "@/lib/themes";
import { setDefaultTheme } from "./actions";

export const metadata: Metadata = { title: "Theme · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminTheme({ searchParams }: PageProps<"/admin/theme">) {
  await requireAdmin("/admin/theme");
  const [current, sp] = await Promise.all([getDefaultTheme(), searchParams]);
  return (
    <section className="page" style={{ maxWidth: 900 }}>
      <p className="small"><Link href="/admin">← Admin</Link></p>
      <h1 className="page-title">Theme</h1>
      <p className="lede">
        Which look the site opens in for anyone who hasn&apos;t picked one. Visitors who press the theme
        button keep their own choice on their device.
      </p>
      {sp.saved && <p className="admin-note" role="status">Saved. New visitors now get this theme.</p>}
      {sp.error && <p className="admin-note" role="alert">That isn&apos;t a theme. Nothing changed.</p>}
      <form action={setDefaultTheme} className="admin-form theme-default-form">
        <fieldset>
          <legend>Default theme</legend>
          {THEMES.map((t) => (
            <label key={t.id}>
              <input type="radio" name="theme" value={t.id} defaultChecked={t.id === current} />
              <span><strong>{t.name}</strong> <span className="muted small">{t.note}</span></span>
            </label>
          ))}
        </fieldset>
        <button className="btn">Save default</button>
      </form>
    </section>
  );
}
