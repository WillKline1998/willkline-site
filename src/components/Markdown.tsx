import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MediaBlock } from "@/components/MediaBlock";
import { toEmbed } from "@/lib/embeds";

// Markdown for Writing posts and Lab pages. Raw HTML is NOT rendered (safe by
// default). A paragraph that is just a YouTube/Vimeo/Spotify/SoundCloud or
// audio/video link becomes a real player, same as bulletin attachments.

const components: Components = {
  p({ node, children }) {
    const only = node?.children.length === 1 ? node.children[0] : null;
    if (only?.type === "element" && only.tagName === "a") {
      const href = String(only.properties?.href ?? "");
      const text = only.children[0]?.type === "text" ? only.children[0].value : "";
      if (text === href && toEmbed(href).kind !== "link") return <MediaBlock m={{ kind: "EMBED", url: href, caption: "" }} />;
    }
    return <p>{children}</p>;
  },
  img({ src, alt }) {
    const url = typeof src === "string" ? src : "";
    return (
      <figure className="media media-image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt ?? ""} loading="lazy" />
        {alt && <figcaption className="media-caption">{alt}</figcaption>}
      </figure>
    );
  },
  a({ href, children }) {
    const external = href?.startsWith("http");
    return <a href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{children}</a>;
  },
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{children}</ReactMarkdown>
    </div>
  );
}
