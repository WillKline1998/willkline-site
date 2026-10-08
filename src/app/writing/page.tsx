import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { longDate } from "@/lib/dates";

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
            <li key={p.id}>
              <Link href={`/writing/${p.slug}`} className="post-link">
                <span className="post-title">{p.title}</span>
                {p.summary && <span className="post-summary">{p.summary}</span>}
              </Link>
              {p.publishedAt && <time className="post-date" dateTime={p.publishedAt.toISOString()}>{longDate(p.publishedAt)}</time>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
