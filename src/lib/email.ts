import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Outgoing email through Resend (https://resend.com), installed via the Vercel
// Marketplace, which sets RESEND_API_KEY. Without a key (local dev and tests),
// messages are written to storage/outbox/ instead, so flows stay testable.

export type Email = { to: string | string[]; subject: string; text: string };

const FROM = process.env.EMAIL_FROM ?? "Will Kline <hello@willkline.net>";
export const SITE_URL = process.env.SITE_URL ?? "https://willkline.net";

export async function sendEmail(email: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    const dir = path.join(process.cwd(), "storage", "outbox");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`), JSON.stringify(email, null, 2));
    return true;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: email.to, subject: email.subject, text: email.text }),
    });
    if (!res.ok) console.error("email failed", res.status, await res.text());
    return res.ok;
  } catch (e) {
    // Email is a side effect: never let a provider outage break the page.
    console.error("email failed", e);
    return false;
  }
}
