import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { flatten, pagesLabel } from "@/lib/songbook";
import { fileUrl, formatBytes } from "@/lib/storage";
import { BulkUpload } from "./BulkUpload";
import { createFolder, deleteFolder, deleteSong, replaceSongFile, updateFolder, updateSong } from "./actions";

export const metadata: Metadata = { title: "Songbook · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSongbook(props: PageProps<"/admin/songbook">) {
  await requireAdmin("/admin/songbook");
  const sp = await props.searchParams;
  const only = typeof sp.folder === "string" ? sp.folder : "";
  const [folders, songs] = await Promise.all([
    db.songFolder.findMany({ select: { id: true, name: true, parentId: true } }),
    db.song.findMany({ where: only === "none" ? { folderId: null } : only ? { folderId: only } : {}, orderBy: { title: "asc" } }),
  ]);
  const options = flatten(folders);
  const counts = new Map<string, number>();
  for (const s of await db.song.findMany({ select: { folderId: true } })) counts.set(s.folderId ?? "none", (counts.get(s.folderId ?? "none") ?? 0) + 1);

  const folderSelect = (name: string, value: string | null, exclude?: string) => (
    <select name={name} defaultValue={value ?? ""} aria-label={name === "parentId" ? "Inside" : "Folder"}>
      <option value="">{name === "parentId" ? "Top level" : "No folder"}</option>
      {options.filter((o) => o.id !== exclude).map((o) => <option key={o.id} value={o.id}>{"\u00A0\u00A0".repeat(o.depth)}{o.label}</option>)}
    </select>
  );

  return (
    <section className="page page-wide">
      <p className="small"><Link href="/admin">← Admin</Link> · <Link href="/songbook">View the Songbook</Link></p>
      <h1 className="page-title">Songbook</h1>
      <p className="lede">Your arrangements as PDFs. Make folders as you go, drop PDFs in, move them around later.</p>

      {typeof sp.error === "string" && <p className="form-error" role="alert">{sp.error}</p>}

      <h2 className="section-label">Upload</h2>
      <BulkUpload folders={options} />

      <h2 className="section-label">Folders</h2>
      {options.length === 0 && <p className="muted">No folders yet. Add one below (like “Gospel” or “Originals”), then add folders inside it.</p>}
      <ul className="song-folder-admin">
        {options.map((o) => {
          const f = folders.find((x) => x.id === o.id)!;
          return (
            <li key={f.id} style={{ marginLeft: `${o.depth * 1.25}rem` }}>
              <form action={updateFolder} className="inline-form" style={{ flexWrap: "wrap" }}>
                <input type="hidden" name="id" value={f.id} />
                <input type="text" name="name" defaultValue={f.name} aria-label="Folder name" required maxLength={60} />
                {folderSelect("parentId", f.parentId, f.id)}
                <button className="btn btn-quiet">Save</button>
                <Link className="small" href={`/admin/songbook?folder=${f.id}`}>{counts.get(f.id) ?? 0} {(counts.get(f.id) ?? 0) === 1 ? "song" : "songs"}</Link>
              </form>
              <form action={deleteFolder} className="inline-form">
                <input type="hidden" name="id" value={f.id} />
                <button className="btn btn-danger" title="Songs and folders inside move up one level">Delete folder</button>
              </form>
            </li>
          );
        })}
      </ul>
      <form action={createFolder} className="admin-form song-newfolder">
        <label>New folder<input type="text" name="name" required maxLength={60} placeholder="Gospel" /></label>
        <label>Inside{folderSelect("parentId", null)}</label>
        <button className="btn">Add folder</button>
      </form>

      <h2 className="section-label">Songs {only ? `(${only === "none" ? "no folder" : options.find((o) => o.id === only)?.label ?? "folder"})` : `(${songs.length})`}</h2>
      <p className="small">
        <Link href="/admin/songbook">All</Link> · <Link href="/admin/songbook?folder=none">No folder ({counts.get("none") ?? 0})</Link>
      </p>
      {songs.length === 0 && <p className="muted">Nothing here yet.</p>}
      <ul className="song-admin-list">
        {songs.map((s) => (
          <li key={s.id}>
            <form action={updateSong} className="song-admin-form">
              <input type="hidden" name="id" value={s.id} />
              <input type="text" name="title" defaultValue={s.title} aria-label="Title" required maxLength={120} />
              <input type="text" name="artist" defaultValue={s.artist} aria-label="Artist" placeholder="Artist (optional)" maxLength={120} />
              {folderSelect("folderId", s.folderId)}
              <input type="text" name="notes" defaultValue={s.notes} aria-label="Notes" placeholder="Notes (optional)" maxLength={1000} />
              <label className="small"><input type="checkbox" name="published" defaultChecked={s.published} /> visible</label>
              <button className="btn btn-quiet">Save</button>
            </form>
            <div className="small muted">
              <a href={fileUrl(s.fileKey)} target="_blank" rel="noreferrer">{s.fileName}</a> · {pagesLabel(s.pages)} · {formatBytes(s.size)}
            </div>
            <form action={replaceSongFile} className="inline-form">
              <input type="hidden" name="id" value={s.id} />
              <input type="file" name="file" accept="application/pdf,.pdf" required aria-label="New version" />
              <button className="btn btn-quiet">Replace PDF</button>
            </form>
            <form action={deleteSong} className="inline-form">
              <input type="hidden" name="id" value={s.id} />
              <button className="btn btn-danger">Delete</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
