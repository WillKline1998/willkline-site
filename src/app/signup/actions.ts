"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { HANDLE, LIMITS, signupsOpen } from "@/lib/wall";
import { notifyAdmins } from "@/lib/notify";
import { SITE_URL } from "@/lib/email";
import { emailField, parse, passwordField, textFields } from "@/lib/validation";
import { z } from "zod";

export type SignupState = { error?: string; values?: { name: string; handle: string; email: string } };

const SignupForm = z.object({
  name: z.string().trim().min(1, "Add a display name.").transform((s) => s.slice(0, 60)),
  handle: z.string().trim().toLowerCase().transform((s) => s.replace(/^@/, "")).pipe(
    z.string().regex(HANDLE, "Handles are 3–20 characters: lowercase letters, numbers, underscores."),
  ),
  email: emailField,
  password: passwordField,
});

export async function signup(_prev: SignupState, form: FormData): Promise<SignupState> {
  const raw = textFields(form, ["name", "handle", "email", "password"]);
  // Echo back what they typed (never the password) so a typo doesn't lose the form.
  const values = { name: raw.name.trim().slice(0, 60), handle: raw.handle.trim(), email: raw.email.trim() };
  const fail = (error: string): SignupState => ({ error, values });

  if (!(await signupsOpen())) return fail("Sign-ups are closed right now.");
  // Bots fill every field and submit instantly; people don't.
  if (String(form.get("website") ?? "") !== "") return fail("Something went wrong. Try again.");
  if (Date.now() - Number(form.get("t") ?? 0) < 3000) return fail("That was fast! Give it another second and try again.");

  const parsed = parse(SignupForm, raw);
  if (parsed.error !== undefined) return fail(parsed.error);
  const { name, handle, email, password } = parsed.data;

  const lastHour = await db.user.count({ where: { createdAt: { gt: new Date(Date.now() - 3600_000) } } });
  if (lastHour >= LIMITS.signupsPerHour) return fail("Lots of sign-ups right now. Please try again in an hour.");

  const taken = await db.user.findFirst({ where: { OR: [{ email }, { handle }] }, select: { email: true } });
  if (taken) return fail(taken.email === email ? "There's already an account with that email. Log in instead?" : `@${handle} is taken.`);

  const user = await db.user.create({ data: { name, handle, email, passwordHash: await hashPassword(password), role: "MEMBER" } });
  await createSession(user.id);
  await notifyAdmins(`New Wall member: @${handle}`, [`${name} (@${handle}, ${email}) just joined the Inspiration Wall.`, `Profile: ${SITE_URL}/wall/u/${handle}`]);
  redirect("/wall?welcome=1");
}
