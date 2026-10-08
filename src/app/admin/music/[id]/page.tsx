import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatDuration } from "@/lib/duration";
import { TrackListEditor } from "../TrackListEditor";

export const metadata: Metadata = { title: "Track list · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminAlbumTracks(props: PageProps<"/admin/music/[id]">) {
  const { id } = await props.params;
  await requireAdmin(`/admin/music/${id}`);
  const album = await db.album.findUnique({ where: { id }, include: { tracks: { orderBy: { position: "asc" } } } });
  if (!album) notFound();
  return (
    <section className="page" style={{ maxWidth: 820 }}>
      <p className="small"><Link href="/admin/music">← Music</Link> · <Link href={`/music/${album.slug}`}>View release page</Link></p>
      <div className="admin-album" style={{ alignItems: "center" }}>
        {album.coverUrl && <Image src={album.coverUrl} alt="" width={96} height={96} className="album-cover" />}
        <h1 className="page-title" style={{ margin: 0 }}>{album.title}</h1>
      </div>
      <h2 className="section-label">Track list</h2>
      <TrackListEditor albumId={album.id} initial={album.tracks.map((t) => ({ title: t.title, duration: formatDuration(t.durationSec) }))} />
    </section>
  );
}
