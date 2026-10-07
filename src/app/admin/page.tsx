import type { Metadata } from "next";
import Link from "next/link";
import { adminEnabled } from "@/lib/admin";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

// Admin home. Real login arrives in M3; until then admin tools only run locally.
export default function AdminPage() {
  return (
    <section className="page">
      <h1 className="page-title">Admin</h1>
      {adminEnabled() ? (
        <>
          <p className="admin-note">Local-only for now. Login (and editing from anywhere) arrives in milestone M3.</p>
          <ul className="cv-list">
            <li><Link href="/admin/documents">Documents</Link>: résumé, CV, and any other downloads</li>
            <li className="muted">Bulletin posts, bio, CV text, music: coming in M3</li>
          </ul>
        </>
      ) : (
        <p className="muted">Admin login is coming soon.</p>
      )}
    </section>
  );
}
