import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PostForm } from "../../PostForm";

export const metadata: Metadata = { title: "Edit post · Inspiration Wall", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EditWallPost(props: PageProps<"/wall/edit/[id]">) {
  const { id } = await props.params;
  const user = await requireUser(`/wall/edit/${id}`);
  const post = await db.wallPost.findUnique({ where: { id } });
  if (!post || (post.authorId !== user.id && user.role !== "ADMIN")) notFound();
  return (
    <section className="page">
      <p className="small"><Link href="/wall">← Inspiration Wall</Link></p>
      <h1 className="page-title">Edit post</h1>
      <PostForm post={post} />
    </section>
  );
}
