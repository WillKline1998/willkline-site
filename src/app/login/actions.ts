"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";

// Crude brute-force brake: per-email failure counter, in memory.
const failures = new Map<string, { n: number; until: number }>();

export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "");

  const f = failures.get(email);
  if (f && f.until > Date.now()) return { error: "Too many attempts. Try again in a few minutes.", email };

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    const n = (f?.n ?? 0) + 1;
    failures.set(email, { n, until: n >= 5 ? Date.now() + 5 * 60_000 : 0 });
    return { error: "That email and password don't match.", email };
  }
  failures.delete(email);
  await createSession(user.id);
  const home = user.role === "ADMIN" ? "/admin" : "/wall";
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : home);
}

export async function logout() {
  await destroySession();
  redirect("/");
}
