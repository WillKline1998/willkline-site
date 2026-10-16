import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { NewCleanupForm } from "../NewCleanupForm";

export const metadata: Metadata = { title: "Add a clean-up", robots: { index: false } };

export default async function NewCleanupPage() {
  await requireUser("/cleanup/new");
  return (
    <section className="page page-wide cleanup">
      <p className="small"><Link href="/cleanup">← Cleanup Map</Link></p>
      <h1 className="page-title">Add a clean-up</h1>
      <p className="lede">Draw the route you cleaned, then tell us a little about it.</p>
      <NewCleanupForm />
    </section>
  );
}
