import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addPostImage, deletePost, savePost } from "../actions";

export const metadata: Metadata = { title: "Edit post · Admin" };
export const dynamic = "force-dynamic";

export default async function EditPost(props: PageProps<"/admin/writing/[id]">) {
  const { id } = await props.params;
  await requireAdmin(`/admin/writing/${id}`);
  const p = await db.post.findUnique({ where: { id } });
  if (!p) notFound();
  return (
    <section className="page" style={{ maxWidth: 900 }}>
      <p className="small">
        <Link href="/admin/writing">← Writing</Link> · <Link href={`/writing/${p.slug}`}>{p.published ? "View" : "Preview draft"}</Link>
      </p>
      <h1 className="page-title">Edit post</h1>
      <form action={savePost} className="admin-form" style={{ maxWidth: "none" }}>
        <input type="hidden" name="id" value={p.id} />
        <label>Title<input type="text" name="title" defaultValue={p.title} required /></label>
        <label>Web address: willkline.net/writing/…<input type="text" name="slug" defaultValue={p.slug} /></label>
        <label>One-line summary (shown in the list)<input type="text" name="summary" defaultValue={p.summary} /></label>
        <label>
          Text
          <textarea name="body" rows={22} defaultValue={p.body} />
        </label>
        <details className="small muted">
          <summary>Formatting tips</summary>
          <p>
            Blank line = new paragraph. <code>## Heading</code>, <code>**bold**</code>, <code>*italic*</code>, <code>&gt; quote</code>,{" "}
            <code>- list item</code>, <code>[link text](https://…)</code>. Paste a YouTube, Vimeo, Spotify, or SoundCloud link on its own
            line to show a player.
          </p>
        </details>
        <label className="small"><input type="checkbox" name="published" defaultChecked={p.published} /> Published (visible to everyone)</label>
        <button className="btn">Save</button>
      </form>

      <h2 className="section-label">Add an image</h2>
      <form action={addPostImage} className="admin-form">
        <input type="hidden" name="id" value={p.id} />
        <label>Image<input type="file" name="file" accept="image/*" required /></label>
        <label>Caption (optional)<input type="text" name="caption" /></label>
        <p className="small muted" style={{ margin: 0 }}>Added to the end of the text. Save your edits first, then move the line where you want it.</p>
        <button className="btn btn-quiet">Upload &amp; insert</button>
      </form>

      <form action={deletePost} style={{ marginTop: "2rem" }}>
        <input type="hidden" name="id" value={p.id} />
        <button className="btn btn-danger">Delete this post</button>
      </form>
    </section>
  );
}
