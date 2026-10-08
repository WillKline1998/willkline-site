import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { WallCard } from "@/components/WallCard";

export const dynamic = "force-dynamic";

const include = { author: { select: { handle: true, name: true } }, _count: { select: { saves: true } } } as const;

export async function generateMetadata(props: PageProps<"/wall/u/[handle]">): Promise<Metadata> {
  const { handle } = await props.params;
  return { title: `@${handle} · Inspiration Wall` };
}

// A member's public page: what they've shared + their saved collection.
export default async function MemberPage(props: PageProps<"/wall/u/[handle]">) {
  const { handle } = await props.params;
  const member = await db.user.findUnique({ where: { handle: handle.toLowerCase() } });
  if (!member) notFound();
  const viewer = await currentUser();
  const [shared, savedRows, viewerSaves] = await Promise.all([
    db.wallPost.findMany({ where: { authorId: member.id, hidden: false }, orderBy: { createdAt: "desc" }, include }),
    db.save.findMany({ where: { userId: member.id, wallPost: { hidden: false } }, orderBy: { createdAt: "desc" }, include: { wallPost: { include } } }),
    viewer ? db.save.findMany({ where: { userId: viewer.id }, select: { wallPostId: true } }) : [],
  ]);
  const vs = new Set(viewerSaves.map((s) => s.wallPostId));
  const isMe = viewer?.id === member.id;

  return (
    <section className="page page-wide">
      <p className="small"><Link href="/wall">← Inspiration Wall</Link></p>
      <h1 className="page-title">{member.name || `@${member.handle}`}</h1>
      <p className="lede">@{member.handle}{isMe && " · this is your page; share the link!"}</p>

      <h2 className="section-label">Collection ({savedRows.length})</h2>
      {savedRows.length === 0 ? <p className="muted">Nothing saved yet.</p> : (
        <div className="wall-grid">{savedRows.map((s) => <WallCard key={s.wallPostId} p={s.wallPost} viewer={viewer} saved={vs.has(s.wallPostId)} />)}</div>
      )}

      <h2 className="section-label">Shared ({shared.length})</h2>
      {shared.length === 0 ? <p className="muted">Nothing shared yet.</p> : (
        <div className="wall-grid">{shared.map((p) => <WallCard key={p.id} p={p} viewer={viewer} saved={vs.has(p.id)} />)}</div>
      )}
    </section>
  );
}
