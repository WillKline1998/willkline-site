import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { KIND_LABEL } from "@/lib/music";
import { formatDuration } from "@/lib/duration";

export const dynamic = "force-dynamic";

const PLATFORM: Record<string, string> = {
  hyperfollow: "All platforms (Spotify, Apple Music, …)",
  spotify: "Spotify",
  bandcamp: "Bandcamp",
  soundcloud: "SoundCloud",
  youtube: "YouTube",
  apple: "Apple Music",
  deezer: "Deezer",
  amazon: "Amazon Music",
  tidal: "TIDAL",
};

async function getAlbum(slug: string) {
  return db.album.findUnique({ where: { slug }, include: { tracks: { orderBy: { position: "asc" } } } });
}

export async function generateMetadata(props: PageProps<"/music/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const a = await getAlbum(slug);
  return { title: a?.title ?? "Music" };
}

// One page per release (Will's request): cover, notes, and every place to listen.
export default async function AlbumPage(props: PageProps<"/music/[slug]">) {
  const { slug } = await props.params;
  const a = await getAlbum(slug);
  if (!a || !a.published) notFound();
  const links = Object.entries(JSON.parse(a.links) as Record<string, string>);

  return (
    <section className="page">
      <p className="small"><Link href="/music">← All music</Link></p>
      <div className="album-detail">
        {a.coverUrl && (
          <Image src={a.coverUrl} alt={`${a.title} cover`} width={360} height={360} className="album-cover" priority />
        )}
        <div>
          <h1 className="page-title">{a.title}</h1>
          <p className="album-kind">{KIND_LABEL[a.kind] ?? "Album"}{a.year ? ` · ${a.year}` : ""}</p>
          <p className={a.description ? "" : "muted"}>
            {a.description || "Liner notes coming soon."}
          </p>
          {a.tracks.length > 0 && <TrackList tracks={a.tracks} />}
          <h2 className="section-label">Listen</h2>
          <ul className="listen-links">
            {links.map(([k, url]) => (
              <li key={k}><a href={url} target="_blank" rel="noreferrer">{PLATFORM[k] ?? k} ↗</a></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// Display-only numbered list; durations and total runtime when known.
function TrackList({ tracks }: { tracks: { id: string; title: string; durationSec: number | null }[] }) {
  const timed = tracks.filter((t) => t.durationSec != null);
  const total = timed.reduce((sum, t) => sum + (t.durationSec ?? 0), 0);
  return (
    <>
      <h2 className="section-label">
        Tracks <span className="track-total">{tracks.length} {tracks.length === 1 ? "track" : "tracks"}{timed.length === tracks.length && total ? ` · ${formatDuration(total)}` : ""}</span>
      </h2>
      <ol className="tracklist">
        {tracks.map((t) => (
          <li key={t.id}>
            <span className="tracklist-title">{t.title}</span>
            {t.durationSec != null && <span className="tracklist-dur">{formatDuration(t.durationSec)}</span>}
          </li>
        ))}
      </ol>
    </>
  );
}
