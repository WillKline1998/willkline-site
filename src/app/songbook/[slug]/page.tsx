import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { openGraph } from "@/lib/seo";
import { pagesLabel, pathTo } from "@/lib/songbook";
import { fileUrl, formatBytes } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/songbook/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const s = await db.song.findFirst({ where: { slug, published: true }, select: { title: true, artist: true } });
  if (!s) return { title: "Songbook" };
  const description = `${s.title}${s.artist ? ` (${s.artist})` : ""}: an arrangement by Will Kline.`;
  return { title: s.title, description, openGraph: openGraph({ title: s.title, description }) };
}

export default async function SongPage(props: PageProps<"/songbook/[slug]">) {
  const { slug } = await props.params;
  const song = await db.song.findFirst({ where: { slug, published: true } });
  if (!song) notFound();
  const crumbs = pathTo(await db.songFolder.findMany({ select: { id: true, name: true, parentId: true } }), song.folderId);
  const url = fileUrl(song.fileKey);

  return (
    <article className="page page-wide songbook">
      <nav className="song-crumbs" aria-label="Folders">
        <Link href="/songbook">Songbook</Link>
        {crumbs.map((c) => (
          <span key={c.id}> / <Link href={`/songbook?folder=${c.id}`}>{c.name}</Link></span>
        ))}
      </nav>
      <h1 className="page-title">{song.title}</h1>
      <p className="small muted">{song.artist ? `${song.artist} · ` : ""}{pagesLabel(song.pages)} · PDF, {formatBytes(song.size)}</p>
      {song.notes && <p className="song-notes">{song.notes}</p>}
      <p className="song-actions">
        <a className="btn" href={url} target="_blank" rel="noreferrer">Open PDF</a>
        <a className="btn btn-quiet" href={url} download={song.fileName}>Download</a>
      </p>
      <object data={`${url}#view=FitH`} type="application/pdf" className="song-viewer" aria-label={`${song.title} (PDF)`}>
        <p className="muted">Your browser can&apos;t show PDFs here. Use “Open PDF” above.</p>
      </object>
    </article>
  );
}
