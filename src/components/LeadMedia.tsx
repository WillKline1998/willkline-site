import { MediaBlock } from "@/components/MediaBlock";

// The single optional picture or video at the top of a post.
export function LeadMedia({ kind, url, alt }: { kind: string | null; url: string | null; alt: string }) {
  if (!kind || !url) return null;
  if (kind === "IMAGE")
    return (
      <figure className="media lead-media lead-image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt} />
      </figure>
    );
  return (
    <div className="lead-media">
      <MediaBlock m={{ kind: "EMBED", url, caption: "" }} />
    </div>
  );
}
