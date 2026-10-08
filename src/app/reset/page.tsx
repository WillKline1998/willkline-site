import type { Metadata } from "next";
import Link from "next/link";
import { validReset } from "./actions";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ResetPage(props: PageProps<"/reset">) {
  const sp = await props.searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const ok = await validReset(token);
  return (
    <section className="page">
      <h1 className="page-title">Choose a new password</h1>
      {ok ? (
        <ResetForm token={token} />
      ) : (
        <p className="admin-note">This link has expired or was already used. <Link href="/forgot">Request a new one</Link>.</p>
      )}
    </section>
  );
}
