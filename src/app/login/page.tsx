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
      <LoginForm next={next} />
      <p className="small muted">New to the Inspiration Wall? <Link href="/signup">Create an account</Link></p>
    </section>
  );
}
