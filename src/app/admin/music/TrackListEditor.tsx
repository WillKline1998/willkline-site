"use client";

import { useActionState, useState } from "react";
import { saveTracks, type TracksState } from "./tracks-actions";

type Row = { key: number; title: string; duration: string };
let nextKey = 0;
const blank = (): Row => ({ key: nextKey++, title: "", duration: "" });

// Spreadsheet-style track list: starts with one blank row, "+ Add track"
// appends another. Order on screen = track order. Nothing saves until Save.
export function TrackListEditor({ albumId, initial }: { albumId: string; initial: { title: string; duration: string }[] }) {
  const [rows, setRows] = useState<Row[]>(() => (initial.length ? initial.map((t) => ({ key: nextKey++, ...t })) : [blank()]));
  const [state, action, pending] = useActionState<TracksState, FormData>(saveTracks, {});

  const update = (key: number, field: "title" | "duration", value: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  const move = (i: number, by: number) =>
    setRows((rs) => {
      const next = [...rs];
      [next[i], next[i + by]] = [next[i + by], next[i]];
      return next;
    });
  const remove = (key: number) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : [blank()]));

  return (
    <form action={action} className="track-editor">
      <input type="hidden" name="albumId" value={albumId} />
      <ol className="track-rows">
        {rows.map((r, i) => (
          <li key={r.key} className="track-row">
            <span className="track-no">{i + 1}</span>
            <input type="text" name="title" value={r.title} onChange={(e) => update(r.key, "title", e.target.value)} placeholder="Track name" aria-label={`Track ${i + 1} name`} />
            <input type="text" name="duration" value={r.duration} onChange={(e) => update(r.key, "duration", e.target.value)} placeholder="3:25" inputMode="numeric" aria-label={`Track ${i + 1} duration (optional)`} className="track-dur" />
            <span className="track-tools">
              <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button type="button" className="icon-btn" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">↓</button>
              <button type="button" className="icon-btn" onClick={() => remove(r.key)} aria-label={`Remove track ${i + 1}`}>✕</button>
            </span>
          </li>
        ))}
      </ol>
      <div className="track-actions">
        <button type="button" className="btn btn-quiet" onClick={() => setRows((rs) => [...rs, blank()])}>+ Add track</button>
        <button className="btn" disabled={pending}>{pending ? "Saving…" : "Save track list"}</button>
        {state.error && <span className="form-error" role="alert">{state.error}</span>}
        {state.ok && !pending && <span className="small" role="status">Saved ✓</span>}
      </div>
      <p className="small muted">Duration is optional (like 3:25). Rows without a name are skipped. Leave every row empty to hide the track list.</p>
    </form>
  );
}
