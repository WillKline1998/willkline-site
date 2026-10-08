import type { Metadata } from "next";

type OpenGraph = NonNullable<Metadata["openGraph"]>;

// Next.js replaces (not merges) a parent's openGraph when a page sets its own,
// so pages build theirs through this to keep the site name and a fallback image.
export const DEFAULT_OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "Will Kline: bassist, composer, and software engineer" };

export function openGraph(page: OpenGraph = {}): OpenGraph {
  return { siteName: "Will Kline", locale: "en_US", type: "website", images: [DEFAULT_OG_IMAGE], ...page } as OpenGraph;
}
