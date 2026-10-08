import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { sections } from "@/lib/sections";

const BASE = "https://willkline.net";

// Rebuilt on each request so new releases, posts and Lab projects appear at once.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [albums, posts, lab] = await Promise.all([
    db.album.findMany({ where: { published: true }, select: { slug: true } }),
    db.post.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    db.labProject.findMany({ where: { published: true, body: { not: "" } }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    ...sections.map((s) => ({ url: BASE + s.href })),
    ...albums.map((a) => ({ url: `${BASE}/music/${a.slug}` })),
    ...posts.map((p) => ({ url: `${BASE}/writing/${p.slug}`, lastModified: p.updatedAt })),
    ...lab.map((p) => ({ url: `${BASE}/lab/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
