"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { HANDLE, LIMITS, signupsOpen } from "@/lib/wall";
import { notifyAdmins } from "@/lib/notify";
import { SITE_URL } from "@/lib/email";

export type SignupState = { error?: string; values?: { name: string; handle: string; email: string } };

export async function signup(_prev: SignupState, form: FormData): Promise<SignupState> {
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const handle = String(form.get("handle") ?? "").trim().toLowerCase().replace(/^@/, "");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const values = { name, handle, email };
  const fail = (error: string): SignupState => ({ error, values });

  if (!(await signupsOpen())) return fail("Sign-ups are closed right now.");
  // Bots fill every field and submit instantly; people don't.
  if (String(form.get("website") ?? "") !== "") return fail("Something went wrong. Try again.");
  if (Date.now() - Number(form.get("t") ?? 0) < 3000) return fail("That was fast! Give it another second and try again.");

  if (!name) return fail("Add a display name.");
  if (!HANDLE.test(handle)) return fail("Handles are 3–20 characters: lowercase letters, numbers, underscores.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("That email doesn't look right.");
  if (password.length < 10) return fail("Use a password of at least 10 characters.");

  const lastHour = await db.user.count({ where: { createdAt: { gt: new Date(Date.now() - 3600_000) } } });
  if (lastHour >= LIMITS.signupsPerHour) return fail("Lots of sign-ups right now. Please try again in an hour.");

  const taken = await db.user.findFirst({ where: { OR: [{ email }, { handle }] }, select: { email: true } });
  if (taken) return fail(taken.email === email ? "There's already an account with that email. Log in instead?" : `@${handle} is taken.`);

  const user = await db.user.create({ data: { name, handle, email, passwordHash: await hashPassword(password), role: "MEMBER" } });
  await createSession(user.id);
  await notifyAdmins(`New Wall member: @${handle}`, [`${name} (@${handle}, ${email}) just joined the Inspiration Wall.`, `Profile: ${SITE_URL}/wall/u/${handle}`]);
  redirect("/wall?welcome=1");
}
