import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addMediaItem, deleteMediaItem, updateMediaItem } from "./actions";

export const metadata: Metadata = { title: "Media · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminMedia(props: PageProps<"/admin/media">) {
  await requireAdmin("/admin/media");
  const sp = await props.searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const items = await db.mediaItem.findMany({ orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] });

  return (
    <section className="page" style={{ maxWidth: 900 }}>
      <p className="small"><Link href="/admin">← Admin</Link> · <Link href="/media">View Media page</Link></p>
      <h1 className="page-title">Media</h1>
      {sp.added && !error && <p className="admin-note" role="status">Added ✓</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      <h2 className="section-label">Add a photo</h2>
      <form action={addMediaItem} className="admin-form">
        <input type="hidden" name="kind" value="PHOTO" />
        <label>Photo (resized automatically, up to 4 MB)<input type="file" name="image" accept="image/*" required /></label>
        <label>Title (optional)<input type="text" name="title" placeholder="e.g. Aspen, summer 2022" /></label>
        <button className="btn">Add photo</button>
      </form>

      <h2 className="section-label">Add a video</h2>
      <form action={addMediaItem} className="admin-form">
        <input type="hidden" name="kind" value="VIDEO" />
        <label>Video link (YouTube, Vimeo, …)<input type="url" name="video" required placeholder="https://www.youtube.com/watch?v=…" /></label>
        <label>Title (optional)<input type="text" name="title" /></label>
        <button className="btn">Add video</button>
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
                  <span className="small muted">▶ Video</span>
                )}
              </td>
              <td>
                <form action={updateMediaItem} className="inline-form">
                  <input type="hidden" name="id" value={m.id} />
                  <input type="number" name="sortOrder" defaultValue={m.sortOrder} style={{ width: 64 }} aria-label="Order" />
                  <input type="text" name="title" defaultValue={m.title} placeholder="Title" aria-label="Title" />
                  <label><input type="checkbox" name="published" defaultChecked={m.published} /> visible</label>
                  <button className="btn btn-quiet">Save</button>
                </form>
                {m.kind === "VIDEO" && <div className="small muted" style={{ wordBreak: "break-all" }}>{m.url}</div>}
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
