import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { signupsOpen } from "@/lib/wall";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Join the Inspiration Wall", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  if (await currentUser()) redirect("/wall");
  const open = await signupsOpen();
  return (
    <section className="page">
      <h1 className="page-title">Join the Wall</h1>
      <p className="lede">Share art and music you love, and save other people&apos;s finds into your own collection.</p>
      {open ? <SignupForm /> : <p className="admin-note">Sign-ups are closed for now. Check back soon!</p>}
      <p className="small muted">Already have an account? <Link href="/login?next=/wall">Log in</Link></p>
    </section>
  );
}
