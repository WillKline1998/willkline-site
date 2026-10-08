"use client";

import { useActionState } from "react";
import { resetPassword, type ResetState } from "./actions";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword, {});
  return (
    <form action={action} className="admin-form">
      <input type="hidden" name="token" value={token} />
      <label>New password<input type="password" name="password" autoComplete="new-password" minLength={10} required /></label>
      <label>Type it again<input type="password" name="confirm" autoComplete="new-password" minLength={10} required /></label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? "Saving…" : "Save new password"}</button>
    </form>
  );
}
