import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { myCleanups } from "@/lib/cleanup";
import { formatMiles } from "@/lib/geo";
import { deleteCleanup } from "../actions";

export const metadata: Metadata = { title: "Your clean-ups", robots: { index: false } };

export default async function MyCleanupsPage(props: PageProps<"/cleanup/mine">) {
  const user = await requireUser("/cleanup/mine");
  const sp = await props.searchParams;
  const mine = await myCleanups(user.id);
  return (
    <section className="page page-wide cleanup">
      <p className="small"><Link href="/cleanup">← Cleanup Map</Link></p>
      <h1 className="page-title">Your clean-ups</h1>
      {sp.deleted === "1" && <p className="admin-note" role="status">Deleted. Its miles are out of the totals too.</p>}
      {mine.length === 0 ? (
        <p className="muted">You haven&apos;t added one yet. <Link href="/cleanup/new">Add your first</Link>.</p>
      ) : (
        <ul className="cleanup-list">
          {mine.map((c) => (
            <li key={c.id} className="cleanup-mine">
              <div>
                <strong>{c.title}</strong>
                <span className="muted small">
                  {c.cleanedOn.toISOString().slice(0, 10)} · {formatMiles(c.distanceM)}
                  {c.bags ? ` · ${c.bags} bag${c.bags === 1 ? "" : "s"}` : ""}
                  {c.isPrivate ? " · private" : ""}
                  {c.hidden ? " · hidden by a moderator" : ""}
                </span>
              </div>
              <form action={deleteCleanup}>
                <input type="hidden" name="id" value={c.id} />
                <button className="btn btn-quiet">Delete</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
