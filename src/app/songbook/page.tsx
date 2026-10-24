import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { openGraph } from "@/lib/seo";
import { PAGE_FILTERS, matchesPages, pagesLabel, pathTo, subtreeIds, type PageFilter } from "@/lib/songbook";

const DESCRIPTION = "Piano arrangements and lead sheets as PDFs, sorted into folders.";
export const metadata: Metadata = { title: "Songbook", description: DESCRIPTION, openGraph: openGraph({ title: "Songbook", description: DESCRIPTION }) };
export const dynamic = "force-dynamic";

export default async function SongbookPage(props: PageProps<"/songbook">) {
  const sp = await props.searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 60);
  const pagesFilter: PageFilter | undefined = typeof sp.pages === "string" && sp.pages in PAGE_FILTERS ? (sp.pages as PageFilter) : undefined;
  const [folders, songs] = await Promise.all([
    db.songFolder.findMany({ select: { id: true, name: true, parentId: true } }),
    db.song.findMany({ where: { published: true }, select: { id: true, slug: true, title: true, artist: true, pages: true, folderId: true } }),
  ]);
  const folderId = typeof sp.folder === "string" && folders.some((f) => f.id === sp.folder) ? sp.folder : null;
  const crumbs = pathTo(folders, folderId);
  const searching = q !== "" || pagesFilter !== undefined;

  // Searching or filtering by pages looks through the whole book; otherwise you browse one folder at a time.
  const needle = q.toLowerCase();
  const list = songs
    .filter((s) => (searching ? true : folderId ? s.folderId === folderId : s.folderId === null))
    .filter((s) => !needle || s.title.toLowerCase().includes(needle) || s.artist.toLowerCase().includes(needle))
    .filter((s) => matchesPages(s.pages, pagesFilter))
    .sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" }));

  const kids = searching
    ? []
    : folders.filter((f) => f.parentId === folderId).sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  const countIn = (id: string) => {
    const ids = subtreeIds(folders, id);
    return songs.filter((s) => s.folderId && ids.has(s.folderId)).length;
  };
  const folderLabel = (id: string | null) => pathTo(folders, id).map((f) => f.name).join(" / ");

  const href = (o: { folder?: string | null; q?: string; pages?: PageFilter | "" }) => {
    const p = new URLSearchParams();
    const f = o.folder === undefined ? folderId : o.folder;
    if (f) p.set("folder", f);
    const text = o.q === undefined ? q : o.q;
    if (text) p.set("q", text);
    const pg = o.pages === undefined ? pagesFilter : o.pages || undefined;
    if (pg) p.set("pages", pg);
    return p.size ? `/songbook?${p}` : "/songbook";
  };

  return (
    <section className="page page-wide songbook">
      <h1 className="page-title">Songbook</h1>
      <p className="lede">My arrangements: chord charts and lead sheets, mostly for piano. Open one, print it, play it.</p>

      {songs.length === 0 ? (
        <p className="muted">Arrangements are on the way.</p>
      ) : (
        <>
          <div className="song-controls">
            <form role="search" action="/songbook" className="search-form">
              <input type="search" name="q" defaultValue={q} placeholder="Search a title or artist…" aria-label="Search the Songbook" maxLength={60} />
              {pagesFilter && <input type="hidden" name="pages" value={pagesFilter} />}
              {folderId && !searching && <input type="hidden" name="folder" value={folderId} />}
              <button className="btn btn-quiet">Search</button>
            </form>
            <nav className="wall-filters" aria-label="Length">
              <Link href={href({ pages: "" })} aria-current={!pagesFilter ? "page" : undefined}>Any length</Link>
              {(Object.keys(PAGE_FILTERS) as PageFilter[]).map((k) => (
                <Link key={k} href={href({ pages: k })} aria-current={pagesFilter === k ? "page" : undefined}>{PAGE_FILTERS[k]}</Link>
              ))}
            </nav>
          </div>

          {searching ? (
            <p className="small muted search-status">
              {list.length} {list.length === 1 ? "song" : "songs"}{q ? <> matching “{q}”</> : null}{pagesFilter ? <>, {PAGE_FILTERS[pagesFilter]}</> : null}, across every folder · <Link href="/songbook">Clear</Link>
            </p>
          ) : (
            <nav className="song-crumbs" aria-label="Folders">
              <Link href="/songbook" aria-current={!folderId ? "page" : undefined}>All songs</Link>
              {crumbs.map((c, i) => (
                <span key={c.id}> / <Link href={`/songbook?folder=${c.id}`} aria-current={i === crumbs.length - 1 ? "page" : undefined}>{c.name}</Link></span>
              ))}
            </nav>
          )}

          {kids.length > 0 && (
            <ul className="song-folders">
              {kids.map((f) => (
                <li key={f.id}>
                  <Link href={`/songbook?folder=${f.id}`}>
                    <strong>{f.name}</strong>
                    <span className="small muted">{countIn(f.id)} {countIn(f.id) === 1 ? "song" : "songs"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {list.length === 0 ? (
            <p className="muted">{searching ? "Nothing matches that." : kids.length ? "" : "Nothing in this folder yet."}</p>
          ) : (
            <ul className="song-list">
              {list.map((s) => (
                <li key={s.id}>
                  <Link href={`/songbook/${s.slug}`} className="song-row">
                    <span className="song-title">{s.title}</span>
                    {s.artist && <span className="song-artist muted">{s.artist}</span>}
                    <span className="song-meta small muted">
                      {searching && s.folderId ? `${folderLabel(s.folderId)} · ` : ""}{pagesLabel(s.pages)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

