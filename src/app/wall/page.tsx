import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { WallCard } from "@/components/WallCard";
import { WALL_KINDS, signupsOpen } from "@/lib/wall";
import { PostForm } from "./PostForm";

export const metadata: Metadata = { title: "Inspiration Wall" };
export const dynamic = "force-dynamic";

const PAGE = 24;

export default async function WallPage(props: PageProps<"/wall">) {
  const sp = await props.searchParams;
  const kind = typeof sp.kind === "string" && sp.kind in WALL_KINDS ? sp.kind : undefined;
  const before = typeof sp.before === "string" && !isNaN(Date.parse(sp.before)) ? new Date(sp.before) : undefined;
  const viewer = await currentUser();

  const [posts, savedIds, open] = await Promise.all([
    db.wallPost.findMany({
      where: { hidden: false, kind, createdAt: before ? { lt: before } : undefined },
      orderBy: { createdAt: "desc" },
      take: PAGE + 1,
      include: { author: { select: { handle: true, name: true } }, _count: { select: { saves: true } } },
    }),
    viewer ? db.save.findMany({ where: { userId: viewer.id }, select: { wallPostId: true } }) : [],
    signupsOpen(),
  ]);
  const saved = new Set(savedIds.map((s) => s.wallPostId));
  const more = posts.length > PAGE;
  const shown = posts.slice(0, PAGE);
  const href = (k?: string) => (k ? `/wall?kind=${k}` : "/wall");

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
            {" · "}
            <form action={logout} style={{ display: "inline" }}><button className="link-button">Log out</button></form>
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

      <nav className="wall-filters" aria-label="Filter">
        <Link href={href()} aria-current={!kind ? "page" : undefined}>All</Link>
        {Object.entries(WALL_KINDS).map(([k, label]) => (
          <Link key={k} href={href(k)} aria-current={kind === k ? "page" : undefined}>{label}</Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <p className="muted">Nothing here yet{kind ? " in this category" : ""}. {viewer ? "Be the first!" : ""}</p>
      ) : (
        <div className="wall-grid">
          {shown.map((p) => <WallCard key={p.id} p={p} viewer={viewer} saved={saved.has(p.id)} />)}
        </div>
      )}
      {more && (
        <p><Link className="btn btn-quiet" href={`/wall?${new URLSearchParams({ ...(kind ? { kind } : {}), before: shown[shown.length - 1].createdAt.toISOString() })}`}>Older →</Link></p>
      )}
    </section>
  );
}
