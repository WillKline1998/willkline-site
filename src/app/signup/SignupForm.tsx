"use client";

import { useActionState, useState } from "react";
import { signup, type SignupState } from "./actions";

export function SignupForm() {
  const [state, action, pending] = useActionState<SignupState, FormData>(signup, {});
  const [startedAt] = useState(() => Date.now());
  const v = state.values;
  return (
    <form action={action} className="admin-form" key={state.error}>
      <input type="hidden" name="t" value={startedAt} />
      {/* Honeypot: hidden from people, irresistible to bots. */}
      <label className="hp" aria-hidden>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      <label>Display name<input type="text" name="name" required maxLength={60} defaultValue={v?.name} autoComplete="name" /></label>
      <label>Handle (your page: willkline.net/wall/u/…)<input type="text" name="handle" required defaultValue={v?.handle} placeholder="e.g. bassnerd" autoCapitalize="none" /></label>
      <label>Email (private; only for logging in)<input type="email" name="email" required defaultValue={v?.email} autoComplete="email" /></label>
      <label>Password (10+ characters)<input type="password" name="password" required minLength={10} autoComplete="new-password" /></label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? "Creating…" : "Create account"}</button>
    </form>
  );
}
