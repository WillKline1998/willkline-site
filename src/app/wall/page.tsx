import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { WallCard } from "@/components/WallCard";
import { WALL_KINDS, signupsOpen } from "@/lib/wall";
import { PostForm } from "./PostForm";

export const metadata: Metadata = { title: "Inspiration Wall" };
export const dynamic = "force-dynamic";

const PAGE = 24;
const SORTS = { new: "Newest", old: "Oldest", random: "Random" } as const;
type Sort = keyof typeof SORTS;

const include = { author: { select: { handle: true, name: true } }, _count: { select: { saves: true } } } as const;

// Newest/oldest page through with a date cursor; random draws a fresh
// sample of up to PAGE posts each visit (shuffle in memory: the wall is small).
async function loadPosts(kind: string | undefined, sort: Sort, cursor: Date | undefined) {
  const where = { hidden: false, kind };
  if (sort === "random") {
    const ids = (await db.wallPost.findMany({ where, select: { id: true } })).map((p) => p.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const pick = ids.slice(0, PAGE);
    const rows = await db.wallPost.findMany({ where: { id: { in: pick } }, include });
    return { posts: pick.map((id) => rows.find((r) => r.id === id)!).filter(Boolean), more: false };
  }
  const posts = await db.wallPost.findMany({
    where: { ...where, createdAt: cursor ? (sort === "old" ? { gt: cursor } : { lt: cursor }) : undefined },
    orderBy: { createdAt: sort === "old" ? "asc" : "desc" },
    take: PAGE + 1,
    include,
  });
  return { posts: posts.slice(0, PAGE), more: posts.length > PAGE };
}

export default async function WallPage(props: PageProps<"/wall">) {
  const sp = await props.searchParams;
  const kind = typeof sp.kind === "string" && sp.kind in WALL_KINDS ? sp.kind : undefined;
  const sort: Sort = typeof sp.sort === "string" && sp.sort in SORTS ? (sp.sort as Sort) : "new";
  const cursor = typeof sp.cursor === "string" && !isNaN(Date.parse(sp.cursor)) ? new Date(sp.cursor) : undefined;
  const viewer = await currentUser();

  const [{ posts, more }, savedIds, open] = await Promise.all([
    loadPosts(kind, sort, cursor),
    viewer ? db.save.findMany({ where: { userId: viewer.id }, select: { wallPostId: true } }) : [],
    signupsOpen(),
  ]);
  const saved = new Set(savedIds.map((s) => s.wallPostId));
  const href = (o: { kind?: string; sort?: Sort; cursor?: string }) => {
    const q = new URLSearchParams();
    if (o.kind) q.set("kind", o.kind);
    if (o.sort && o.sort !== "new") q.set("sort", o.sort);
    if (o.cursor) q.set("cursor", o.cursor);
    return q.size ? `/wall?${q}` : "/wall";
  };

  return (
    <section className="page page-wide">
      <h1 className="page-title">Inspiration Wall</h1>
      <p className="lede">Art and music that moves people. Share what inspires you, and save what inspires you here.</p>
      {sp.welcome === "1" && <p className="admin-note">Welcome{viewer?.name ? `, ${viewer.name}` : ""}! Share your first find below.</p>}

      {viewer ? (
        <>
          <p className="small muted">
            Signed in as {viewer.handle ? <Link href={`/wall/u/${viewer.handle}`}>@{viewer.handle}</Link> : viewer.email}
            {viewer.handle && <> · <Link href={`/wall/u/${viewer.handle}`}>My collection</Link></>}
          </p>
          <details className="wall-share">
            <summary className="btn">+ Share something</summary>
            <PostForm />
          </details>
        </>
      ) : (
        <p className="wall-cta">
          {open && <Link href="/signup" className="btn">Join to share &amp; save</Link>}
          <Link href="/login?next=/wall" className="btn btn-quiet">Log in</Link>
        </p>
      )}

      <div className="wall-controls">
        <nav className="wall-filters" aria-label="Filter">
          <Link href={href({ sort })} aria-current={!kind ? "page" : undefined}>All</Link>
          {Object.entries(WALL_KINDS).map(([k, label]) => (
            <Link key={k} href={href({ kind: k, sort })} aria-current={kind === k ? "page" : undefined}>{label}</Link>
          ))}
        </nav>
        <nav className="wall-sort" aria-label="Sort">
          <span className="wall-sort-label">Sort</span>
          {(Object.keys(SORTS) as Sort[]).map((s) => (
            <Link key={s} href={href({ kind, sort: s })} aria-current={sort === s ? "page" : undefined}>{SORTS[s]}</Link>
          ))}
        </nav>
      </div>

      {posts.length === 0 ? (
        <p className="muted">Nothing here yet{kind ? " in this category" : ""}. {viewer ? "Be the first!" : ""}</p>
      ) : (
        <div className="wall-grid">
          {posts.map((p) => <WallCard key={p.id} p={p} viewer={viewer} saved={saved.has(p.id)} />)}
        </div>
      )}
      {sort === "random" && posts.length > 1 && (
        // Plain <a>: a full reload guarantees a fresh draw (client nav to the same URL may reuse it).
        <p><a className="btn btn-quiet" href={href({ kind, sort })}>⟳ Shuffle again</a></p>
      )}
      {more && (
        <p>
          <Link className="btn btn-quiet" href={href({ kind, sort, cursor: posts[posts.length - 1].createdAt.toISOString() })}>
            {sort === "old" ? "Newer →" : "Older →"}
          </Link>
        </p>
      )}
    </section>
  );
}
