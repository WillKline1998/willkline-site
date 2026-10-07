import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createNotice } from "./actions";
import { NoticeFields } from "./NoticeFields";

export const metadata: Metadata = { title: "Bulletin · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminNotices() {
  await requireAdmin("/admin/notices");
  const notices = await db.notice.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { media: true } } },
  });
  return (
    <section className="page" style={{ maxWidth: 900 }}>
      <p className="small"><Link href="/admin">← Admin</Link></p>
      <h1 className="page-title">Bulletin</h1>
      <table className="admin-table">
        <tbody>
          {notices.map((n) => (
            <tr key={n.id}>
              <td><Link href={`/admin/notices/${n.id}`}>{n.title}</Link></td>
              <td className="small muted">{n.kind.toLowerCase()}{n.pinned ? " · pinned" : ""}{n.published ? "" : " · hidden"}</td>
              <td className="small muted">{n._count.media} attachment{n._count.media === 1 ? "" : "s"}</td>
              <td className="small muted">{n.createdAt.toLocaleDateString("en-US")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="section-label">New post</h2>
      <form action={createNotice} className="admin-form">
        <NoticeFields />
        <button className="btn">Create post (then add photos, videos, files)</button>
      </form>
    </section>
  );
}
