import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPage() {
  return (
    <section className="page">
      <h1 className="page-title">Forgot your password?</h1>
      <p className="lede">Enter your account&apos;s email and we&apos;ll send you a link to choose a new one.</p>
      <ForgotForm />
      <p className="small muted"><Link href="/login">Back to log in</Link></p>
    </section>
  );
}
