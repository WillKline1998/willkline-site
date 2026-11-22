import type { Metadata } from "next";
import { getSetting } from "@/lib/settings";

export const metadata: Metadata = { title: "Bio" };
export const dynamic = "force-dynamic";

// Bio text is plain paragraphs separated by blank lines (SiteSetting "bio"). An optional photo (SiteSetting
// "bio_photo", set on /admin/bio) sits at the head of the page, beside the text on wide screens.
export default async function BioPage() {
  const [bio, photo, alt] = await Promise.all([
    getSetting("bio"),
    getSetting("bio_photo"),
    getSetting("bio_photo_alt"),
  ]);
  const paragraphs = bio
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <section className="page bio-page">
      {/* Wide screens: the photo alone is frozen (sticky from the first scrolled pixel); the heading belongs to
          the text and scrolls away with it. Phones: one column (heading, photo, text), nothing sticky. */}
      <div className={photo ? "bio-layout has-photo" : "bio-layout"}>
        <h1 className="page-title bio-title">Bio</h1>
        {photo && (
          <div className="bio-keep">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={alt} className="bio-photo" />
          </div>
        )}
        <div className="prose bio-prose">
          {paragraphs.length ? (
            paragraphs.map((p, i) => <p key={i}>{p}</p>)
          ) : (
            <p className="muted">Bio coming soon.</p>
          )}
        </div>
      </div>
    </section>
  );
}
