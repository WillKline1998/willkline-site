"use client";

import { useActionState, useCallback, useState } from "react";
import { RouteDrawer } from "@/components/RouteDrawer";
import { HIDE_ENDS_M as HIDE_M, type LngLat } from "@/lib/geo";
import { createCleanup, type CleanupState } from "./actions";

const today = () => new Date().toISOString().slice(0, 10);

export function NewCleanupForm() {
  const [state, action, pending] = useActionState<CleanupState, FormData>(createCleanup, {});
  const v = state.values;
  const [hideEnds, setHideEnds] = useState(v?.hideEnds ?? true);
  const [line, setLine] = useState<LngLat[]>([]);
  const onChange = useCallback((l: LngLat[]) => setLine(l), []);

  return (
    <form action={action} className="admin-form cleanup-form">
      <RouteDrawer hideEnds={hideEnds} onChange={onChange} />
      <input type="hidden" name="route" value={JSON.stringify(line)} />
      <label>Name this clean-up<input type="text" name="title" required maxLength={80} defaultValue={v?.title} placeholder="Rocky River, north bank" /></label>
      <div className="cleanup-pair">
        <label>The day<input type="date" name="cleanedOn" required max={today()} defaultValue={v?.cleanedOn || today()} /></label>
        <label>Bags filled (optional)<input type="number" name="bags" min={0} max={500} inputMode="numeric" defaultValue={v?.bags ?? "0"} /></label>
      </div>
      <label>Anything to add? (optional)<textarea name="note" rows={3} maxLength={400} defaultValue={v?.note} placeholder="What you found, who came along, where the bags went." /></label>
      <label>
        <input type="checkbox" name="hideEnds" checked={hideEnds} onChange={(e) => setHideEnds(e.target.checked)} />
        Hide where I started and finished ({HIDE_M} m at each end), so my home isn&apos;t on a public map
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="btn" disabled={pending || line.length < 2}>{pending ? "Saving…" : "Add to the map"}</button>
    </form>
  );
}
