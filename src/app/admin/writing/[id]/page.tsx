import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PictureOrVideo } from "@/components/PictureOrVideo";
import { deletePost, savePost } from "../actions";

export const metadata: Metadata = { title: "Edit post · Admin" };
export const dynamic = "force-dynamic";

export default async function EditPost(props: PageProps<"/admin/writing/[id]">) {
  const { id } = await props.params;
  await requireAdmin(`/admin/writing/${id}`);
  const p = await db.post.findUnique({ where: { id } });
  if (!p) notFound();
  const sp = await props.searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <section className="page" style={{ maxWidth: 900 }}>
      <p className="small">
        <Link href="/admin/writing">← Writing</Link> · <Link href={`/writing/${p.slug}`}>{p.published ? "View post" : "Preview draft"}</Link>
      </p>
      <h1 className="page-title">Edit post</h1>
      {sp.saved === "1" && !error && <p className="admin-note" role="status">Saved ✓{p.published ? " It's live." : " (Still a draft: tick Published to post it.)"}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      <form action={savePost} className="admin-form" style={{ maxWidth: "none" }}>
        <input type="hidden" name="id" value={p.id} />
        <label>Title (required)<input type="text" name="title" defaultValue={p.title} required /></label>
        <label>
          Text
          <textarea name="body" rows={18} defaultValue={p.body} />
        </label>
        <details className="small muted">
          <summary>Formatting tips</summary>
          <ul>
            <li><strong>Enter</strong> once = new line (poems keep their line breaks).</li>
            <li><strong>Blank line</strong> = new paragraph or stanza.</li>
            <li>
              <code>## Heading</code>, <code>**bold**</code>, <code>*italic*</code>, <code>&gt; quote</code>, <code>- list item</code>,{" "}
              <code>[link text](https://…)</code>
            </li>
          </ul>
        </details>
        <PictureOrVideo kind={p.mediaKind} url={p.mediaUrl} />
        <label>Web address: willkline.net/writing/…<input type="text" name="slug" defaultValue={p.slug} /></label>
        <label className="small">
          <input type="checkbox" name="published" defaultChecked={p.published} /> Published (visible to everyone)
          {p.publishedAt && <span className="muted"> · first posted {p.publishedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" })}</span>}
        </label>
        <button className="btn">Save</button>
      </form>

      <form action={deletePost} style={{ marginTop: "2rem" }}>
        <input type="hidden" name="id" value={p.id} />
        <button className="btn btn-danger">Delete this post</button>
      </form>
    </section>
  );
}
