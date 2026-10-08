import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { signupsOpen } from "@/lib/wall";
import { deleteWallPost, setHidden } from "@/app/wall/actions";
import { adminNotificationsOn } from "@/lib/notify";
import { deleteMember, setNotify, setSignups } from "./actions";

export const metadata: Metadata = { title: "Wall · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminWall() {
  await requireAdmin("/admin/wall");
  const [open, notify, posts, members] = await Promise.all([
    signupsOpen(),
    adminNotificationsOn(),
    db.wallPost.findMany({
      orderBy: [{ hidden: "desc" }, { reports: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: { author: { select: { handle: true } } },
    }),
    db.user.findMany({ where: { role: "MEMBER" }, orderBy: { createdAt: "desc" }, include: { _count: { select: { wallPosts: true } } } }),
  ]);

  return (
    <section className="page" style={{ maxWidth: 900 }}>
      <p className="small"><Link href="/admin">← Admin</Link> · <Link href="/wall">View Wall</Link></p>
      <h1 className="page-title">Inspiration Wall</h1>

      <h2 className="section-label">Sign-ups</h2>
      <form action={setSignups} className="inline-form">
        <span>New members can sign up: <strong>{open ? "Open" : "Closed"}</strong></span>
        <input type="hidden" name="mode" value={open ? "closed" : "open"} />
        <button className="btn btn-quiet">{open ? "Close sign-ups" : "Open sign-ups"}</button>
      </form>
      <form action={setNotify} className="inline-form">
        <span>Email me about new members and reports: <strong>{notify ? "On" : "Off"}</strong></span>
        <input type="hidden" name="mode" value={notify ? "off" : "on"} />
        <button className="btn btn-quiet">{notify ? "Turn off" : "Turn on"}</button>
      </form>

      <h2 className="section-label">Posts (hidden &amp; reported first)</h2>
      {posts.length === 0 && <p className="muted">No posts yet.</p>}
      <table className="admin-table">
        <tbody>
          {posts.map((p) => (
            <tr key={p.id}>
              <td>
                <a href={p.url} target="_blank" rel="noreferrer">{p.title}</a>
                <div className="small muted">@{p.author.handle} · {p.createdAt.toLocaleDateString("en-US")}{p.reports > 0 && ` · ${p.reports} report(s)`}{p.hidden && " · HIDDEN"}</div>
              </td>
              <td>
                <form action={setHidden} className="inline-form">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="hidden" value={p.hidden ? "0" : "1"} />
                  <button className="btn btn-quiet">{p.hidden ? "Unhide" : "Hide"}</button>
                </form>
                <form action={deleteWallPost} className="inline-form">
                  <input type="hidden" name="id" value={p.id} />
                  <button className="btn btn-danger">Delete</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="section-label">Members ({members.length})</h2>
      <table className="admin-table">
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td>
                {m.handle ? <Link href={`/wall/u/${m.handle}`}>@{m.handle}</Link> : m.email} <span className="small muted">{m.name}</span>
                <div className="small muted">{m.email} · joined {m.createdAt.toLocaleDateString("en-US")} · {m._count.wallPosts} posts</div>
              </td>
              <td>
                <form action={deleteMember} className="inline-form">
                  <input type="hidden" name="id" value={m.id} />
                  <button className="btn btn-danger">Remove member</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
