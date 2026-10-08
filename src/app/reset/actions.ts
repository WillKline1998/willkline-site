"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export type ResetState = { error?: string };

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** The reset row for a token, if it's still usable. */
export async function validReset(token: string) {
  if (!token) return null;
  const row = await db.passwordReset.findUnique({ where: { tokenHash: sha256(token) } });
  return row && !row.usedAt && row.expiresAt > new Date() ? row : null;
}

export async function resetPassword(_prev: ResetState, form: FormData): Promise<ResetState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < 10) return { error: "Use a password of at least 10 characters." };
  if (password !== confirm) return { error: "Those passwords don't match." };

  const row = await validReset(token);
  if (!row) return { error: "This link has expired or was already used. Request a new one." };

  // Mark used first (atomically) so a double-submit can't reuse the link.
  const claimed = await db.passwordReset.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count !== 1) return { error: "This link was already used. Request a new one." };

  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(password) } }),
    // Log out everywhere: whoever knew the old password loses access.
    db.session.deleteMany({ where: { userId: row.userId } }),
    db.passwordReset.deleteMany({ where: { userId: row.userId, usedAt: null } }),
  ]);
  redirect("/login?reset=1");
}
