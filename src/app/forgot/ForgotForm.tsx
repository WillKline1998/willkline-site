"use client";

import { useActionState } from "react";
import { requestReset, type ForgotState } from "./actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(requestReset, {});
  if (state.sent) {
    return (
      <p className="admin-note" role="status">
        If there&apos;s an account with that email, a reset link is on its way. It works for one hour. Check your spam folder if it doesn&apos;t show up.
      </p>
    );
  }
  return (
    <form action={action} className="admin-form">
      <label>Email<input type="email" name="email" autoComplete="email" required /></label>
      {/* Bots fill every field; people never see this one. */}
      <label className="hp" aria-hidden>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? "Sending…" : "Email me a reset link"}</button>
    </form>
  );
}
