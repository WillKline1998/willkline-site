import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
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

// Writing turns on `lineBreaks`, so a single Enter in the editor is a real
// line break (poems keep their lines) and a blank line still starts a new
// paragraph or stanza. Lab pages keep standard Markdown.
export function Markdown({ children, lineBreaks = false }: { children: string; lineBreaks?: boolean }) {
  const plugins = lineBreaks ? [remarkGfm, remarkBreaks] : [remarkGfm];
  return (
    <div className="prose markdown">
      <ReactMarkdown remarkPlugins={plugins} components={components}>{children}</ReactMarkdown>
    </div>
  );
}
