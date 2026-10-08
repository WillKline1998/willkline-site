import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { saveAlbum } from "../content-actions";

export const metadata: Metadata = { title: "Music · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminMusic() {
  await requireAdmin("/admin/music");
  const albums = await db.album.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { tracks: true } } } });
  return (
    <section className="page" style={{ maxWidth: 1000 }}>
      <p className="small"><Link href="/admin">← Admin</Link> · <Link href="/music">View Music page</Link></p>
      <h1 className="page-title">Music</h1>
      <p className="lede">Liner notes, years, order (lower numbers show first), and visibility.</p>
      {albums.map((a) => (
        <form key={a.id} action={saveAlbum} className="admin-album">
          <input type="hidden" name="id" value={a.id} />
          <input type="hidden" name="slug" value={a.slug} />
          {a.coverUrl && <Image src={a.coverUrl} alt="" width={96} height={96} className="album-cover" />}
          <div className="admin-form" style={{ maxWidth: "none", flex: 1 }}>
            <strong>{a.title}</strong>
            <Link href={`/admin/music/${a.id}`} className="small tap-link">Track list ({a._count.tracks}) →</Link>
            <label>Liner notes<textarea name="description" rows={3} defaultValue={a.description} /></label>
            <div className="inline-form">
              <label className="small">Year <input type="number" name="year" defaultValue={a.year ?? ""} style={{ width: 90 }} /></label>
              <label className="small">Order <input type="number" name="sortOrder" defaultValue={a.sortOrder} style={{ width: 70 }} /></label>
              <label className="small"><input type="checkbox" name="published" defaultChecked={a.published} /> visible</label>
              <button className="btn btn-quiet">Save</button>
            </div>
          </div>
        </form>
      ))}
    </section>
  );
}
