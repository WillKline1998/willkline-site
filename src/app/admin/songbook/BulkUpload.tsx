"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { uploadSong, type UploadResult } from "./actions";

type Row = { name: string; state: "waiting" | "uploading" | "done" | "failed"; note?: string };

/** Pick as many PDFs as you like; they go up one at a time, with a line per file showing how it went. */
export function BulkUpload({ folders }: { folders: { id: string; label: string }[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [folderId, setFolderId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    const files = Array.from(input.current?.files ?? []);
    if (!files.length || busy) return;
    setBusy(true);
    setRows(files.map((f) => ({ name: f.name, state: "waiting" })));
    const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    for (let i = 0; i < files.length; i++) {
      set(i, { state: "uploading" });
      const form = new FormData();
      form.set("file", files[i]);
      form.set("folderId", folderId);
      let res: UploadResult;
      try {
        res = await uploadSong(form);
      } catch {
        res = { ok: false, error: "The upload didn't go through. Check your connection and try again." };
      }
      set(i, res.ok ? { state: "done", note: `${res.pages} page${res.pages === 1 ? "" : "s"}` } : { state: "failed", note: res.error });
    }
    if (input.current) input.current.value = "";
    setBusy(false);
    router.refresh();
  };

  return (
    <div className="admin-form">
      <label>
        PDFs (choose several at once; each up to 4 MB)
        <input ref={input} type="file" accept="application/pdf,.pdf" multiple disabled={busy} />
      </label>
      <label>
        Put them in
        <select value={folderId} onChange={(e) => setFolderId(e.target.value)} disabled={busy}>
          <option value="">No folder yet</option>
          {folders.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </label>
      <button type="button" className="btn" onClick={start} disabled={busy}>{busy ? "Uploading…" : "Upload"}</button>
      {rows.length > 0 && (
        <ul className="song-upload-list" aria-live="polite">
          {rows.map((r, i) => (
            <li key={i} data-state={r.state}>
              <span>{r.state === "done" ? "✓" : r.state === "failed" ? "✕" : r.state === "uploading" ? "…" : "·"}</span>
              <span>{r.name}</span>
              <span className="small muted">{r.state === "waiting" ? "waiting" : r.state === "uploading" ? "uploading" : r.note}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
