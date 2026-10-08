import type { Metadata } from "next";
import { db } from "@/lib/db";
import { MediaBlock } from "@/components/MediaBlock";
import type { MediaItem } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Media" };
export const dynamic = "force-dynamic";

// Photos open in a pure-CSS lightbox (#photo-<id> + :target): no JS, works everywhere.
function Photos({ items }: { items: MediaItem[] }) {
  return (
    <>
      <ul className="photo-grid">
        {items.map((p) => (
          <li key={p.id}>
            <a href={`#photo-${p.id}`} className="photo-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.title || p.caption || "Photo"} loading="lazy" />
            </a>
          </li>
        ))}
      </ul>
      {items.map((p) => (
        <div key={p.id} id={`photo-${p.id}`} className="lightbox" role="dialog" aria-label={p.title || "Photo"}>
          <a href="#photos" className="lightbox-backdrop" aria-label="Close" />
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.title || p.caption || "Photo"} loading="lazy" />
            {(p.title || p.caption) && (
              <figcaption>
                {p.title && <strong>{p.title}</strong>} {p.caption && <span className="muted">{p.caption}</span>}
              </figcaption>
            )}
            <a href="#photos" className="lightbox-close">Close ✕</a>
          </figure>
        </div>
      ))}
    </>
  );
}

export default async function MediaPage() {
  const items = await db.mediaItem.findMany({ where: { published: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  const of = (k: string) => items.filter((i) => i.kind === k);
  const [photos, videos, audio, press] = [of("PHOTO"), of("VIDEO"), of("AUDIO"), of("PRESS")];

  return (
    <section className="page page-wide">
      <h1 className="page-title">Media</h1>
      {items.length === 0 && <p className="lede">Photos, video, and press are on the way.</p>}

      {photos.length > 0 && (
        <section id="photos">
          <h2 className="section-label">Photos</h2>
          <Photos items={photos} />
        </section>
      )}

      {videos.length > 0 && (
        <section>
          <h2 className="section-label">Video</h2>
          <div className="media-grid">
            {videos.map((v) => (
              <div key={v.id}>
                <MediaBlock m={{ kind: "EMBED", url: v.url, caption: v.title || v.caption }} />
                {v.title && v.caption && <p className="media-caption">{v.caption}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {audio.length > 0 && (
        <section>
          <h2 className="section-label">Audio</h2>
          <div className="media-grid">
            {audio.map((a) => <MediaBlock key={a.id} m={{ kind: "EMBED", url: a.url, caption: a.title || a.caption }} />)}
          </div>
        </section>
      )}

      {press.length > 0 && (
        <section>
          <h2 className="section-label">Press</h2>
          <ul className="press-list">
            {press.map((p) => (
              <li key={p.id}>
                {p.caption && <blockquote>{p.caption}</blockquote>}
                <a href={p.url} target="_blank" rel="noreferrer">{p.title || p.url} ↗</a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
