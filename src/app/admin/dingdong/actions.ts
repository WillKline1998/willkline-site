"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { str } from "@/lib/forms";

// Grant or decline one of DingDong's asks. Only pending asks change; the next 9 AM run reads the
// result (scripts/dingdong-gifts.ts pull) and records it in his state, so his diary can know.
export async function decideWant(form: FormData) {
  await requireAdmin("/admin/dingdong");
  const status = str(form, "decision") === "granted" ? "granted" : "declined";
  await db.dingDongWant.updateMany({ where: { id: str(form, "id"), status: "pending" }, data: { status, grantedAt: new Date() } });
  revalidatePath("/admin/dingdong");
  revalidatePath("/dingdong");
}

// Undo a decision (back to pending), in case of a mis-tap.
export async function reopenWant(form: FormData) {
  await requireAdmin("/admin/dingdong");
  await db.dingDongWant.updateMany({
    where: { id: str(form, "id"), status: { not: "pending" } },
    data: { status: "pending", grantedAt: null },
  });
  revalidatePath("/admin/dingdong");
  revalidatePath("/dingdong");
}
