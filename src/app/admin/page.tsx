import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/app/login/actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const TOOLS = [
  { href: "/admin/notices", label: "Bulletin", note: "Post shows, releases, news, notes, with photos, videos, PDFs" },
  { href: "/admin/documents", label: "Documents", note: "Résumé, CV, and any other downloads" },
  { href: "/admin/bio", label: "Bio", note: "The text on the Bio page" },
  { href: "/admin/cv", label: "CV text", note: "The CV shown on the CV page" },
  { href: "/admin/music", label: "Music", note: "Liner notes, years, visibility, order" },
  { href: "/admin/media", label: "Media", note: "Photos, videos, audio, press" },
  { href: "/admin/writing", label: "Writing", note: "Posts and essays (drafts stay private)" },
  { href: "/admin/lab", label: "Lab", note: "Projects and experiments" },
  { href: "/admin/wall", label: "Inspiration Wall", note: "Sign-ups on/off, moderation, members" },
];

export default async function AdminPage() {
  const user = await requireAdmin();
  return (
    <section className="page">
      <h1 className="page-title">Admin</h1>
      <p className="lede">Signed in as {user.email}.</p>
      <ul className="admin-tools">
        {TOOLS.map((t) => (
          <li key={t.href}>
            <Link href={t.href}>{t.label}</Link>
            <span className="muted small">{t.note}</span>
          </li>
        ))}
      </ul>
      <form action={logout}><button className="btn btn-quiet">Log out</button></form>
    </section>
  );
}
