import type { Metadata } from "next";
import { getSetting } from "@/lib/settings";

export const metadata: Metadata = { title: "Bio" };
export const dynamic = "force-dynamic";

// Bio text is plain paragraphs separated by blank lines (SiteSetting "bio").
export default async function BioPage() {
  const bio = await getSetting("bio");
  const paragraphs = bio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <section className="page">
      <h1 className="page-title">Bio</h1>
      <div className="prose">
        {paragraphs.length ? paragraphs.map((p, i) => <p key={i}>{p}</p>) : <p className="muted">Bio coming soon.</p>}
      </div>
    </section>
  );
}
