import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addMediaItem, deleteMediaItem, updateMediaItem } from "./actions";

export const metadata: Metadata = { title: "Media · Admin" };
export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = { PHOTO: "Photo", VIDEO: "Video", AUDIO: "Audio", PRESS: "Press" };

export default async function AdminMedia() {
  await requireAdmin("/admin/media");
  const items = await db.mediaItem.findMany({ orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] });
  return (
    <section className="page" style={{ maxWidth: 900 }}>
      <p className="small"><Link href="/admin">← Admin</Link> · <Link href="/media">View Media page</Link></p>
      <h1 className="page-title">Media</h1>

      <h2 className="section-label">Add</h2>
      <form action={addMediaItem} className="admin-form">
        <label>
          Type
          <select name="kind" defaultValue="PHOTO">
            <option value="PHOTO">Photo</option>
            <option value="VIDEO">Video (YouTube / Vimeo link, or a short video file)</option>
            <option value="AUDIO">Audio (Spotify / SoundCloud link, or an audio file)</option>
            <option value="PRESS">Press (link to an article or review)</option>
          </select>
        </label>
        <label>Upload a file<input type="file" name="file" accept="image/*,video/*,audio/*" /></label>
        <label>…or paste a link<input type="url" name="url" placeholder="https://" /></label>
        <label>Title (optional)<input type="text" name="title" placeholder="e.g. Aspen 2022, or the publication name" /></label>
        <label>Caption / credit / quote (optional)<input type="text" name="caption" /></label>
        <p className="small muted" style={{ margin: 0 }}>Uploads up to 4.5 MB. For longer video, upload to YouTube and paste the link.</p>
        <button className="btn">Add</button>
      </form>

      <h2 className="section-label">On the page</h2>
      {items.length === 0 && <p className="muted">Nothing yet.</p>}
      <table className="admin-table">
        <tbody>
          {items.map((m) => (
            <tr key={m.id}>
              <td style={{ width: 90 }}>
                {m.kind === "PHOTO" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="admin-thumb" />
                ) : (
                  <span className="small muted">{LABEL[m.kind] ?? m.kind}</span>
                )}
              </td>
              <td>
                <form action={updateMediaItem} className="inline-form">
                  <input type="hidden" name="id" value={m.id} />
                  <input type="number" name="sortOrder" defaultValue={m.sortOrder} style={{ width: 64 }} aria-label="Order" />
                  <input type="text" name="title" defaultValue={m.title} placeholder="Title" aria-label="Title" />
                  <input type="text" name="caption" defaultValue={m.caption} placeholder="Caption" aria-label="Caption" />
                  <label><input type="checkbox" name="published" defaultChecked={m.published} /> visible</label>
                  <button className="btn btn-quiet">Save</button>
                </form>
                <div className="small muted" style={{ wordBreak: "break-all" }}>{m.url}</div>
                <form action={deleteMediaItem} className="inline-form">
                  <input type="hidden" name="id" value={m.id} />
                  <button className="btn btn-danger">Delete</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
