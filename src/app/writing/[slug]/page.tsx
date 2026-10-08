import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { longDate } from "@/lib/dates";
import { Markdown } from "@/components/Markdown";

export const dynamic = "force-dynamic";

// Drafts are visible only to the admin (with a banner), so Will can preview.
async function load(slug: string) {
  const post = await db.post.findUnique({ where: { slug } });
  if (!post) return null;
  if (post.published) return post;
  return (await currentUser())?.role === "ADMIN" ? post : null;
}

export async function generateMetadata(props: PageProps<"/writing/[slug]">): Promise<Metadata> {
  const post = await load((await props.params).slug);
  return post ? { title: post.title, description: post.summary || undefined } : {};
}

export default async function PostPage(props: PageProps<"/writing/[slug]">) {
  const post = await load((await props.params).slug);
  if (!post) notFound();
  return (
    <article className="page">
      <p className="small"><Link href="/writing">← Writing</Link></p>
      {!post.published && <p className="admin-note">Draft: only you can see this. <Link href={`/admin/writing/${post.id}`}>Edit</Link></p>}
      <h1 className="page-title">{post.title}</h1>
      {post.publishedAt && <p className="muted small">{longDate(post.publishedAt)}</p>}
      <Markdown>{post.body}</Markdown>
    </article>
  );
}
