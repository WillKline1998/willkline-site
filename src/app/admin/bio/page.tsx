import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { saveBio } from "../content-actions";
import { TextEditor } from "../TextEditor";
import { BioPhotoForm } from "./BioPhotoForm";

export const metadata: Metadata = { title: "Bio · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminBio() {
  await requireAdmin("/admin/bio");
  return (
    <section className="page" style={{ maxWidth: 900 }}>
      <p className="small"><Link href="/admin">← Admin</Link> · <Link href="/bio">View Bio page</Link></p>
      <h1 className="page-title">Bio</h1>
      <BioPhotoForm url={await getSetting("bio_photo")} alt={await getSetting("bio_photo_alt")} />
      <h2 className="section-label">Text</h2>
      <p className="lede">Plain text. Leave a blank line between paragraphs.</p>
      <TextEditor name="bio" initial={await getSetting("bio")} rows={24} action={saveBio} />
    </section>
  );
}
