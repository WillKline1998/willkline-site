"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { parse, passwordField, textFields } from "@/lib/validation";
import { z } from "zod";

export type ResetState = { error?: string };

const ResetForm = z
  .object({ token: z.string(), password: passwordField, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Those passwords don't match.", path: ["confirm"] });

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** The reset row for a token, if it's still usable. */
export async function validReset(token: string) {
  if (!token) return null;
  const row = await db.passwordReset.findUnique({ where: { tokenHash: sha256(token) } });
  return row && !row.usedAt && row.expiresAt > new Date() ? row : null;
}

export async function resetPassword(_prev: ResetState, form: FormData): Promise<ResetState> {
  const parsed = parse(ResetForm, textFields(form, ["token", "password", "confirm"]));
  if (parsed.error !== undefined) return { error: parsed.error };
  const { token, password } = parsed.data;

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
