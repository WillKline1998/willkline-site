import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { KIND_LABEL } from "@/lib/music";

export const metadata: Metadata = { title: "Music" };
export const dynamic = "force-dynamic";

export default async function MusicPage() {
  const albums = await db.album.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } });
  return (
    <section className="page">
      <h1 className="page-title">Music</h1>
      <p className="lede">Everything I&apos;ve released: written, performed, recorded, mixed, and mastered at home.</p>
      <ul className="album-grid">
        {albums.map((a) => (
          <li key={a.id}>
            <Link href={`/music/${a.slug}`} className="album-card">
              {a.coverUrl && (
                <Image src={a.coverUrl} alt={`${a.title} cover`} width={300} height={300} className="album-cover" />
              )}
              <span className="album-title">{a.title}</span>
              <span className="album-kind">{KIND_LABEL[a.kind] ?? "Album"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
