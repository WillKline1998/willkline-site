"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="admin-form">
      <input type="hidden" name="next" value={next} />
      {/* key: React resets forms after an action; remount so the email survives a failed try. */}
      <label>Email<input key={state.email} type="text" name="email" autoComplete="username" defaultValue={state.email} required /></label>
      <label>Password<input type="password" name="password" autoComplete="current-password" required /></label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? "Logging in…" : "Log in"}</button>
    </form>
  );
}
