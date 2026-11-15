"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NO_ARTIST } from "@/lib/songbook";
import { updateSong, type SaveResult } from "./actions";

type Song = { id: string; title: string; artist: string; notes: string; folderId: string | null; published: boolean };
type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; note: string; movedTo?: { id: string | null; label: string } } | { kind: "error"; note: string };

/**
 * One song's title, artist, folder, notes and visibility. Controlled inputs, so what you see is always what was
 * saved: the old uncontrolled form snapped the folder picker back to the OLD folder after a save (React resets a
 * form after an action, and a <select> resets to its first-render option), with no message, so a move looked like
 * it had failed. Now the button walks Save → Saving… → Saved ✓, a move takes you to where the song went and
 * flashes it there, and errors stay on screen in red.
 *
 * Why navigate on a move instead of just updating local state: a Server Action's response always carries a fresh
 * render of the page that called it, so a filtered admin list (one folder open) re-fetches right after Save and
 * drops a song that just moved out of it — no amount of client-side state can keep it visible, since the list
 * itself (not this component) decides which songs are on the page. Going WITH that refresh instead of fighting it
 * — landing on the song's new folder with a flash banner — turns the one redraw moving away from you can't avoid
 * into the clearest possible confirmation that the move worked.
 */
export function SongEditor({ song, folders, view }: { song: Song; folders: { id: string; label: string; depth: number }[]; view: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(song);
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [noArtist, setNoArtist] = useState(song.artist === "");
  const [folderId, setFolderId] = useState(song.folderId ?? "");
  const [notes, setNotes] = useState(song.notes);
  const [published, setPublished] = useState(song.published);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const effectiveArtist = noArtist ? "" : artist.trim();
  const dirty =
    title.trim() !== saved.title ||
    effectiveArtist !== saved.artist ||
    (folderId || null) !== saved.folderId ||
    notes.trim() !== saved.notes ||
    published !== saved.published;
  const touch = () => status.kind !== "saving" && status.kind !== "idle" && setStatus({ kind: "idle" });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status.kind === "saving") return;
    setStatus({ kind: "saving" });
    const form = new FormData();
    form.set("id", song.id);
    form.set("title", title);
    form.set("artist", effectiveArtist);
    form.set("folderId", folderId);
    form.set("notes", notes);
    if (published) form.set("published", "on");
    let res: SaveResult;
    try {
      res = await updateSong(form);
    } catch {
      res = { ok: false, error: "Couldn't save. Check your connection and try again." };
    }
    if (!res.ok) return setStatus({ kind: "error", note: res.error });
    const s = res.song;
    setSaved({ ...s, id: song.id });
    setTitle(s.title);
    setArtist(s.artist);
    setNoArtist(s.artist === "");
    setFolderId(s.folderId ?? "");
    setNotes(s.notes);
    setPublished(s.published);
    // Viewing one folder and the song just left it: the list is about to refresh with or without our say, so
    // follow the song to where it landed and flash it there, rather than lose the confirmation to that refresh.
    const leftView = res.moved && view !== "" && view !== (s.folderId ?? "none");
    if (leftView) {
      router.push(`/admin/songbook?folder=${s.folderId ?? "none"}&moved=${encodeURIComponent(song.id)}#song-${song.id}`);
      return;
    }
    setStatus({ kind: "saved", note: res.moved ? `Moved to ${res.folderLabel}.` : "Changes saved.", movedTo: res.moved ? { id: s.folderId, label: res.folderLabel } : undefined });
    router.refresh(); // folder counts and sorting catch up
  };

  const label = status.kind === "saving" ? "Saving…" : status.kind === "saved" && !dirty ? "Saved ✓" : "Save";
  return (
    <form onSubmit={save} className="song-editor" data-status={status.kind} data-dirty={dirty ? "1" : "0"}>
      <label className="song-editor-title">
        Title
        <input type="text" name="title" value={title} onChange={(e) => (setTitle(e.target.value), touch())} required maxLength={120} />
      </label>
      <label className="song-editor-artist">
        Artist
        <input
          type="text"
          name="artist"
          value={noArtist ? "" : artist}
          onChange={(e) => (setArtist(e.target.value), setNoArtist(false), touch())}
          placeholder={noArtist ? NO_ARTIST : "Who wrote it or made it famous"}
          disabled={noArtist}
          maxLength={120}
        />
      </label>
      <label className="song-editor-check">
        <input type="checkbox" name="noArtist" checked={noArtist} onChange={(e) => (setNoArtist(e.target.checked), touch())} /> No artist (hymns, traditional)
      </label>
      <label className="song-editor-folder">
        Folder
        <select name="folderId" value={folderId} onChange={(e) => (setFolderId(e.target.value), touch())}>
          <option value="">No folder</option>
          {folders.map((o) => (
            <option key={o.id} value={o.id}>
              {"\u00A0\u00A0".repeat(o.depth)}
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="song-editor-notes">
        Notes
        <input type="text" name="notes" value={notes} onChange={(e) => (setNotes(e.target.value), touch())} placeholder="Optional" maxLength={1000} />
      </label>
      <div className="song-editor-actions">
        <label className="song-editor-check">
          <input type="checkbox" name="published" checked={published} onChange={(e) => (setPublished(e.target.checked), touch())} /> Visible on the site
        </label>
        <button className="btn" disabled={status.kind === "saving" || (!dirty && status.kind !== "error")} data-state={status.kind}>
          {label}
        </button>
        <span className="song-editor-status small" role="status" aria-live="polite">
          {status.kind === "saved" && (
            <span className="song-saved">
              ✓ {status.note}
              {status.movedTo && (
                <>
                  {" "}
                  <Link href={status.movedTo.id ? `/admin/songbook?folder=${status.movedTo.id}` : "/admin/songbook?folder=none"}>Open {status.movedTo.label}</Link>
                </>
              )}
            </span>
          )}
          {status.kind === "error" && <span className="form-error">{status.note}</span>}
          {status.kind === "idle" && dirty && <span className="muted">Unsaved changes</span>}
        </span>
      </div>
    </form>
  );
}
