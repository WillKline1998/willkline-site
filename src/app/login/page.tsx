import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  return (
    <section className="page">
      <h1 className="page-title">Log in</h1>
      {sp.reset === "1" && <p className="admin-note" role="status">Password changed. Log in with your new password.</p>}
      <LoginForm next={next} />
      <p className="small muted"><Link href="/forgot">Forgot your password?</Link></p>
      <p className="small muted">New to the Inspiration Wall? <Link href="/signup">Create an account</Link></p>
    </section>
  );
}
