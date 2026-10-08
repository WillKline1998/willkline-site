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
              <img src={p.url} alt={p.title || "Photo"} loading="lazy" />
            </a>
            {p.title && <p className="media-title">{p.title}</p>}
          </li>
        ))}
      </ul>
      {items.map((p) => (
        <div key={p.id} id={`photo-${p.id}`} className="lightbox" role="dialog" aria-label={p.title || "Photo"}>
          <a href="#photos" className="lightbox-backdrop" aria-label="Close" />
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.title || "Photo"} loading="lazy" />
            {p.title && <figcaption>{p.title}</figcaption>}
            <a href="#photos" className="lightbox-close">Close ✕</a>
          </figure>
        </div>
      ))}
    </>
  );
}

export default async function MediaPage() {
  const items = await db.mediaItem.findMany({ where: { published: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  const photos = items.filter((i) => i.kind === "PHOTO");
  const videos = items.filter((i) => i.kind === "VIDEO");

  return (
    <section className="page page-wide">
      <h1 className="page-title">Media</h1>
      {items.length === 0 && <p className="lede">Photos and video are on the way.</p>}

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
                <MediaBlock m={{ kind: "EMBED", url: v.url, caption: "" }} />
                {v.title && <p className="media-title">{v.title}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
