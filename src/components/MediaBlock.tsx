import type { NoticeMedia } from "@/generated/prisma/client";
import { fileName, isPdf, toEmbed } from "@/lib/embeds";

// Renders one attachment on a bulletin post. Kinds come from the admin:
// IMAGE (photo/flyer), EMBED (video/audio URL), FILE (PDF/doc), LINK.
export function MediaBlock({ m }: { m: NoticeMedia }) {
  const caption = m.caption ? <figcaption className="media-caption">{m.caption}</figcaption> : null;

  if (m.kind === "IMAGE")
    return (
      <figure className="media media-image">
        {/* Plain <img>: sources are arbitrary admin URLs/uploads of unknown size. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.url} alt={m.caption || "Attached image"} loading="lazy" />
        {caption}
      </figure>
    );

  if (m.kind === "FILE")
    return (
      <figure className="media media-file">
        {isPdf(m.url) && <iframe src={`${m.url}#view=FitH&toolbar=0`} title={m.caption || fileName(m.url)} loading="lazy" />}
        <a className="file-card" href={m.url} target="_blank" rel="noreferrer">
          <span className="file-icon" aria-hidden>{isPdf(m.url) ? "PDF" : "FILE"}</span>
          <span>{m.caption || fileName(m.url)}</span>
          <span className="file-action">Open ↗</span>
        </a>
      </figure>
    );

  const e = toEmbed(m.url);
  if (m.kind === "EMBED" && e.kind === "iframe")
    return (
      <figure className={`media media-embed aspect-${e.aspect}`}>
        <iframe
          src={e.src}
          title={m.caption || `${e.provider} player`}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
        {caption}
      </figure>
    );
  if (m.kind === "EMBED" && e.kind === "video")
    return (
      <figure className="media media-embed aspect-video">
        <video src={e.src} controls preload="metadata" />
        {caption}
      </figure>
    );

  // LINK, or an EMBED from a provider we don't trust to iframe
  const host = e.kind === "link" ? e.host : new URL(m.url, "https://willkline.net").hostname.replace(/^www\./, "");
  return (
    <a className="file-card link-card" href={m.url} target="_blank" rel="noreferrer">
      <span className="file-icon" aria-hidden>↗</span>
      <span>{m.caption || m.url}</span>
      <span className="file-action">{host}</span>
    </a>
  );
}
