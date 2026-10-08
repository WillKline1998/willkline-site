import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { longDate } from "@/lib/dates";
import { excerpt } from "@/lib/excerpt";

export const metadata: Metadata = { title: "Writing" };
export const dynamic = "force-dynamic";

const SORTS = { new: "Newest", old: "Oldest" } as const;
type Sort = keyof typeof SORTS;

export default async function WritingPage(props: PageProps<"/writing">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const sort: Sort = sp.sort === "old" ? "old" : "new";

  // Search: the phrase appears anywhere in the title or the body (case-insensitive).
  const posts = await db.post.findMany({
    where: {
      published: true,
      ...(q && { OR: [{ title: { contains: q, mode: "insensitive" } }, { body: { contains: q, mode: "insensitive" } }] }),
    },
    orderBy: { publishedAt: sort === "old" ? "asc" : "desc" },
  });
  const total = q ? await db.post.count({ where: { published: true } }) : posts.length;
  const href = (s: Sort) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (s !== "new") params.set("sort", s);
    return params.size ? `/writing?${params}` : "/writing";
  };

  return (
    <section className="page">
      <h1 className="page-title">Writing</h1>
      {total === 0 ? (
        <p className="lede">Essays and notes are on the way.</p>
      ) : (
        <>
          <div className="writing-controls">
            <form role="search" action="/writing" className="search-form">
              <input type="search" name="q" defaultValue={q} placeholder="Search writing…" aria-label="Search writing" />
              {sort !== "new" && <input type="hidden" name="sort" value={sort} />}
              <button className="btn btn-quiet">Search</button>
            </form>
            <nav className="wall-sort" aria-label="Sort">
              {(Object.keys(SORTS) as Sort[]).map((s) => (
                <Link key={s} href={href(s)} aria-current={sort === s ? "page" : undefined}>{SORTS[s]}</Link>
              ))}
            </nav>
          </div>
          {q && (
            <p className="small muted search-status">
              {posts.length} {posts.length === 1 ? "post" : "posts"} matching “{q}” · <Link href={sort === "old" ? "/writing?sort=old" : "/writing"}>Clear search</Link>
            </p>
          )}
          {posts.length === 0 ? (
            <p className="muted">Nothing matches that. Try a different word.</p>
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
        </>
      )}
    </section>
  );
}
