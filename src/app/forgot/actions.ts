"use server";

import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { sendEmail, SITE_URL } from "@/lib/email";
import { emailField, parse } from "@/lib/validation";

export type ForgotState = { sent?: boolean; error?: string };

const HOUR = 3600_000;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function requestReset(_prev: ForgotState, form: FormData): Promise<ForgotState> {
  if (String(form.get("website") ?? "") !== "") return { sent: true }; // honeypot: pretend it worked
  const parsed = parse(emailField, form.get("email") ?? "");
  if (parsed.error !== undefined) return { error: parsed.error };
  const email = parsed.data;

  // Same answer whether or not the account exists, so this can't be used to
  // check who has an account.
  const user = await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  if (user?.passwordHash) {
    const recent = await db.passwordReset.count({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - HOUR) } } });
    if (recent < 3) {
      const token = randomBytes(32).toString("base64url");
      await db.passwordReset.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + HOUR) } });
      await sendEmail({
        to: email,
        subject: "Reset your willkline.net password",
        text: [
          "Someone (hopefully you) asked to reset the password for your willkline.net account.",
          "",
          `Choose a new password here (the link works once, for one hour):`,
          `${SITE_URL}/reset?token=${token}`,
          "",
          "If you didn't ask for this, ignore this email. Your password won't change.",
        ].join("\n"),
      });
    }
  }
  return { sent: true };
}
