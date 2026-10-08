import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { saveCv } from "../../content-actions";
import { TextEditor } from "../../TextEditor";

export const metadata: Metadata = { title: "CV (raw) · Admin" };
export const dynamic = "force-dynamic";

// v1 editor: the CV's structured JSON, validated on save. A friendlier
// section-by-section form can replace this later without changing the data.
export default async function AdminCv() {
  await requireAdmin("/admin/cv");
  return (
    <section className="page" style={{ maxWidth: 1000 }}>
      <p className="small"><Link href="/admin/cv">← CV editor</Link> · <Link href="/cv">View CV page</Link></p>
      <h1 className="page-title">CV (advanced)</h1>
      <p className="lede">
        Edit the text between quotes. Keep the commas and brackets. If something&apos;s off, Save tells you and nothing breaks.
        (The downloadable PDFs are managed under <Link href="/admin/documents">Documents</Link>.)
      </p>
      <TextEditor name="cv" initial={await getSetting("cv", "{}")} rows={40} action={saveCv} mono />
    </section>
  );
}
