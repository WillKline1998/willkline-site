import type { Metadata } from "next";
import { db } from "@/lib/db";
import { MediaBlock } from "@/components/MediaBlock";
import { PhotoGallery } from "@/components/PhotoGallery";

export const metadata: Metadata = { title: "Media" };
export const dynamic = "force-dynamic";

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
          <PhotoGallery photos={photos.map((p) => ({ id: p.id, url: p.url, title: p.title }))} />
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
