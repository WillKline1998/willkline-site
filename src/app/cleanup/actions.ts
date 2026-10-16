"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { CLEANUP_LIMITS } from "@/lib/cleanup";
import { db } from "@/lib/db";
import { HIDE_ENDS_M, checkRoute, lengthM, trimEnds } from "@/lib/geo";
import { checked, str } from "@/lib/forms";
import { parse } from "@/lib/validation";
import { revalidatePath } from "next/cache";

export type CleanupState = {
  error?: string;
  values?: { title: string; note: string; bags: string; cleanedOn: string; route: string; hideEnds: boolean };
};

const today = () => new Date().toISOString().slice(0, 10);

const Fields = z.object({
  title: z.string().min(1, "Give it a name, like “Rocky River, north bank”.").transform((s) => s.slice(0, CLEANUP_LIMITS.title)),
  note: z.string().transform((s) => s.slice(0, CLEANUP_LIMITS.note)),
  bags: z.coerce.number("Bags should be a number.").int().min(0, "Bags can't be negative.").max(CLEANUP_LIMITS.bags, "That is a lot of bags. Check the number."),
  cleanedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the day it happened.")
    .refine((d) => d <= today(), "That day hasn't happened yet.")
    .refine((d) => d >= new Date(Date.now() - 366 * 864e5).toISOString().slice(0, 10), "That was over a year ago."),
});

export async function createCleanup(_prev: CleanupState, form: FormData): Promise<CleanupState> {
  const user = await requireUser("/cleanup/new");
  const values = {
    title: str(form, "title"), note: str(form, "note"), bags: str(form, "bags") || "0",
    cleanedOn: str(form, "cleanedOn"), route: str(form, "route"), hideEnds: checked(form, "hideEnds"),
  };
  const fields = parse(Fields, values);
  if (fields.error !== undefined) return { error: fields.error, values };

  let drawn: unknown;
  try {
    drawn = JSON.parse(values.route);
  } catch {
    drawn = null;
  }
  const route = checkRoute(drawn);
  if (!route.ok) return { error: route.message, values };

  // The privacy rule lives here, not in the browser: whatever the page sent, the start and end are cut
  // off before anything is stored.
  let line = route.line;
  let trimmedM = 0;
  if (values.hideEnds) {
    const cut = trimEnds(line, HIDE_ENDS_M);
    if (!cut)
      return {
        error: `That walk is too short to hide its start and end (it needs about ${HIDE_ENDS_M * 2 + 100} m). Draw a longer one, or untick “Hide where I started and finished”.`,
        values,
      };
    line = cut;
    trimmedM = HIDE_ENDS_M;
  }

  const lately = await db.cleanup.count({ where: { authorId: user.id, createdAt: { gt: new Date(Date.now() - 864e5) } } });
  if (lately >= CLEANUP_LIMITS.perDay) return { error: `That's ${CLEANUP_LIMITS.perDay} clean-ups in a day. Come back tomorrow!`, values };

  const lngs = line.map((p) => p[0]);
  const lats = line.map((p) => p[1]);
  await db.cleanup.create({
    data: {
      authorId: user.id,
      title: fields.data.title,
      note: fields.data.note,
      bags: fields.data.bags,
      cleanedOn: new Date(`${fields.data.cleanedOn}T12:00:00Z`),
      distanceM: Math.round(lengthM(line)),
      route: line,
      trimmedM,
      minLng: Math.min(...lngs), maxLng: Math.max(...lngs),
      minLat: Math.min(...lats), maxLat: Math.max(...lats),
    },
  });
  revalidatePath("/cleanup", "layout");
  redirect("/cleanup?added=1");
}
