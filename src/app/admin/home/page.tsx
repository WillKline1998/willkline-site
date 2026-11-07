import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { BioPhotoForm } from "../bio/BioPhotoForm";

export const metadata: Metadata = { title: "Homepage · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await requireAdmin("/admin/home");
  return (
    <section className="page" style={{ maxWidth: 900 }}>
      <p className="small">
        <Link href="/admin">← Admin</Link> · <Link href="/">View homepage</Link>
      </p>
      <h1 className="page-title">Homepage</h1>
      <p className="lede">
        An optional picture between your name and the first bulletin post, as
        wide as the bulletin. With no picture, nothing shows.
      </p>
      <BioPhotoForm
        slot="home"
        url={await getSetting("home_photo")}
        alt={await getSetting("home_photo_alt")}
      />
    </section>
  );
}
