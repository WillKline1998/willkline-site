import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { longDate } from "@/lib/dates";
import { excerpt } from "@/lib/excerpt";

export const metadata: Metadata = { title: "Writing" };
export const dynamic = "force-dynamic";

export default async function WritingPage() {
  const posts = await db.post.findMany({ where: { published: true }, orderBy: { publishedAt: "desc" } });
  return (
    <section className="page">
      <h1 className="page-title">Writing</h1>
      {posts.length === 0 ? (
        <p className="lede">Essays and notes are on the way.</p>
      ) : (
        <ul className="post-list">
          {posts.map((p) => (
            <li key={p.id} className={p.mediaKind === "IMAGE" ? "has-thumb" : undefined}>
              <Link href={`/writing/${p.slug}`} className="post-link">
                {p.publishedAt && <time className="post-date" dateTime={p.publishedAt.toISOString()}>{longDate(p.publishedAt)}</time>}
                <span className="post-title">{p.title}</span>
                {p.body && <span className="post-summary">{excerpt(p.body)}</span>}
                {p.mediaKind === "VIDEO" && <span className="post-tag">▶ Video</span>}
              </Link>
              {p.mediaKind === "IMAGE" && p.mediaUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.mediaUrl} alt="" className="post-thumb" loading="lazy" />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
