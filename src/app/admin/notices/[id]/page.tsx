import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { NoticeCard } from "@/components/NoticeCard";
import { addMedia, deleteNotice, moveMedia, removeMedia, updateNotice } from "../actions";
import { NoticeFields } from "../NoticeFields";

export const metadata: Metadata = { title: "Edit post · Admin" };
export const dynamic = "force-dynamic";

export default async function EditNotice(props: PageProps<"/admin/notices/[id]">) {
  const { id } = await props.params;
  await requireAdmin(`/admin/notices/${id}`);
  const n = await db.notice.findUnique({ where: { id }, include: { media: { orderBy: { position: "asc" } } } });
  if (!n) notFound();

  return (
    <section className="page" style={{ maxWidth: 900 }}>
      <p className="small"><Link href="/admin/notices">← Bulletin</Link></p>
      <h1 className="page-title">Edit post</h1>

      <form action={updateNotice} className="admin-form">
        <input type="hidden" name="id" value={n.id} />
        <NoticeFields n={n} />
        <button className="btn">Save</button>
      </form>

      <h2 className="section-label">Attachments</h2>
      <table className="admin-table">
        <tbody>
          {n.media.map((m, i) => (
            <tr key={m.id}>
              <td className="small">{m.kind.toLowerCase()}</td>
              <td className="small" style={{ wordBreak: "break-all" }}>{m.caption || m.url}</td>
              <td>
                <form action={moveMedia} className="inline-form">
                  <input type="hidden" name="id" value={m.id} />
                  <button className="btn btn-quiet" name="dir" value="up" disabled={i === 0} aria-label="Move up">↑</button>
                  <button className="btn btn-quiet" name="dir" value="down" disabled={i === n.media.length - 1} aria-label="Move down">↓</button>
                </form>
                <form action={removeMedia} className="inline-form">
                  <input type="hidden" name="id" value={m.id} />
                  <button className="btn btn-danger">Remove</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form action={addMedia} className="admin-form" style={{ marginTop: "1rem" }}>
        <input type="hidden" name="noticeId" value={n.id} />
        <label>Upload a photo, flyer, PDF, or video file<input type="file" name="file" /></label>
        <p className="small muted" style={{ margin: 0 }}>…or paste a link instead:</p>
        <label>
          Link
          <input type="url" name="url" placeholder="YouTube, Vimeo, Spotify, SoundCloud, image URL, any page…" />
        </label>
        <label>
          Show the link as
          <select name="urlKind" defaultValue="EMBED">
            <option value="EMBED">Player (YouTube, Vimeo, Spotify, SoundCloud)</option>
            <option value="IMAGE">Image</option>
            <option value="LINK">Link card</option>
          </select>
        </label>
        <label>Caption (optional)<input type="text" name="caption" /></label>
        <button className="btn">Add attachment</button>
      </form>

      <h2 className="section-label">Preview</h2>
      <NoticeCard n={n} />

      <form action={deleteNotice} style={{ marginTop: "2rem" }}>
        <input type="hidden" name="id" value={n.id} />
        <button className="btn btn-danger">Delete this post</button>
      </form>
    </section>
  );
}
