import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createPost } from "./actions";

export const metadata: Metadata = { title: "Writing · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminWriting() {
  await requireAdmin("/admin/writing");
  const posts = await db.post.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <section className="page" style={{ maxWidth: 900 }}>
      <p className="small"><Link href="/admin">← Admin</Link> · <Link href="/writing">View Writing page</Link></p>
      <h1 className="page-title">Writing</h1>
      <form action={createPost} className="admin-form">
        <label>New post title<input type="text" name="title" required /></label>
        <button className="btn">Start a draft</button>
      </form>
      <h2 className="section-label">Posts</h2>
      {posts.length === 0 && <p className="muted">No posts yet.</p>}
      <table className="admin-table">
        <tbody>
          {posts.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/admin/writing/${p.id}`}>{p.title}</Link></td>
              <td className="small muted">{p.published ? "published" : "draft"}</td>
              <td className="small muted">edited {p.updatedAt.toLocaleDateString("en-US")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
