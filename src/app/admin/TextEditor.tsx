"use client";

import { useActionState } from "react";
import type { SaveState } from "./content-actions";

// One big textarea + Save, with inline success / error feedback.
export function TextEditor(props: {
  name: string;
  initial: string;
  rows: number;
  action: (prev: SaveState, form: FormData) => Promise<SaveState>;
  mono?: boolean;
}) {
  const [state, action, pending] = useActionState(props.action, {});
  return (
    <form action={action} className="admin-form" style={{ maxWidth: "none" }}>
      <textarea
        name={props.name}
        rows={props.rows}
        defaultValue={props.initial}
        spellCheck={!props.mono}
        style={props.mono ? { fontFamily: "var(--font-label)", fontSize: "0.85rem" } : undefined}
      />
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.ok && !pending && <p className="small" role="status">Saved ✓</p>}
      <button className="btn" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
    </form>
  );
}
