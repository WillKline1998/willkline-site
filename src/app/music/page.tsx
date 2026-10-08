import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { KIND_LABEL, KIND_PLURAL } from "@/lib/music";

export const metadata: Metadata = { title: "Music" };
export const dynamic = "force-dynamic";

export default async function MusicPage(props: PageProps<"/music">) {
  const sp = await props.searchParams;
  const all = await db.album.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } });
  // Only offer filters for types that actually have releases, in KIND_LABEL order.
  const kinds = Object.keys(KIND_LABEL).filter((k) => all.some((a) => a.kind === k));
  const kind = typeof sp.kind === "string" && kinds.includes(sp.kind) ? sp.kind : undefined;
  const albums = kind ? all.filter((a) => a.kind === kind) : all;

  return (
    <section className="page">
      <h1 className="page-title">Music</h1>
      <p className="lede">Everything I&apos;ve released: written, performed, recorded, mixed, and mastered at home.</p>
      {kinds.length > 1 && (
        <nav className="wall-filters music-filters" aria-label="Filter by type">
          <Link href="/music" aria-current={!kind ? "page" : undefined}>All</Link>
          {kinds.map((k) => (
            <Link key={k} href={`/music?kind=${k}`} aria-current={kind === k ? "page" : undefined}>{KIND_PLURAL[k]}</Link>
          ))}
        </nav>
      )}
      <ul className="album-grid">
        {albums.map((a) => (
          <li key={a.id}>
            <Link href={`/music/${a.slug}`} className="album-card">
              {a.coverUrl && (
                <Image src={a.coverUrl} alt={`${a.title} cover`} width={300} height={300} className="album-cover" />
              )}
              <span className="album-title">{a.title}</span>
              <span className="album-kind">{KIND_LABEL[a.kind] ?? "Album"}{a.year ? ` · ${a.year}` : ""}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
