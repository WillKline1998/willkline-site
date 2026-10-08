import "server-only";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { sendEmail, SITE_URL } from "@/lib/email";

// Heads-up emails to the site admin(s) about Wall activity.
// Toggled in /admin/wall (SiteSetting "wall_notify", on unless set to "off").

export async function adminNotificationsOn() {
  return (await getSetting("wall_notify", "on")) !== "off";
}

export async function notifyAdmins(subject: string, lines: string[]) {
  if (!(await adminNotificationsOn())) return;
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { email: true } });
  if (admins.length === 0) return;
  await sendEmail({
    to: admins.map((a) => a.email),
    subject: `[willkline.net] ${subject}`,
    text: [...lines, "", `Moderate: ${SITE_URL}/admin/wall`, "Turn these emails off in the same place."].join("\n"),
  });
}
