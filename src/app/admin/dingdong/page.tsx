import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { longDate } from "@/lib/dates";
import { decideWant, reopenWant } from "./actions";

export const metadata: Metadata = { title: "DingDong · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminDingDong() {
  await requireAdmin("/admin/dingdong");
  const [wants, counts, recent] = await Promise.all([
    db.dingDongWant.findMany({ orderBy: [{ status: "desc" }, { createdAt: "desc" }], take: 100 }),
    db.dingDongGift.groupBy({ by: ["status"], _count: true }),
    db.dingDongGift.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const pending = wants.filter((w) => w.status === "pending");
  const decided = wants.filter((w) => w.status !== "pending");
  const n = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <section className="page" style={{ maxWidth: 900 }}>
      <p className="small">
        <Link href="/admin">← Admin</Link> · <Link href="/dingdong">View DingDong</Link>
      </p>
      <h1 className="page-title">DingDong</h1>
      <p className="lede">
        His asks come from words visitors keep giving him. Grant one and his next morning knows he has it. Hermes can do the same from
        Telegram with <code>scripts/dingdong-want.ts</code>.
      </p>

      <h2 className="section-label">He&apos;s asking for ({pending.length})</h2>
      {pending.length === 0 && <p className="muted">Nothing right now.</p>}
      <table className="admin-table dd-admin-wants">
        <tbody>
          {pending.map((w) => (
            <tr key={w.id} data-want={w.word}>
              <td>
                <strong>{w.word}</strong> <span className="small muted">asked {longDate(w.createdAt)}</span>
                <div>{w.reason}</div>
              </td>
              <td>
                <form action={decideWant} className="inline-form">
                  <input type="hidden" name="id" value={w.id} />
                  <button className="btn" name="decision" value="granted">
                    Grant
                  </button>
                  <button className="btn btn-quiet" name="decision" value="declined">
                    Decline
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {decided.length > 0 && (
        <>
          <h2 className="section-label">Decided</h2>
          <table className="admin-table">
            <tbody>
              {decided.map((w) => (
                <tr key={w.id} data-want={w.word}>
                  <td>
                    <strong>{w.word}</strong>{" "}
                    <span className="small muted">
                      {w.status} {w.grantedAt ? longDate(w.grantedAt) : ""}
                    </span>
                    <div className="small muted">{w.reason}</div>
                  </td>
                  <td>
                    <form action={reopenWant} className="inline-form">
                      <input type="hidden" name="id" value={w.id} />
                      <button className="btn btn-quiet">Undo</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2 className="section-label">Gifts</h2>
      <p className="small muted">
        {n("pending")} waiting · {n("processed")} noticed · {n("ignored")} shrugged off. He reads up to 3 each morning.
      </p>
      <ul className="small dd-admin-gifts">
        {recent.map((g) => (
          <li key={g.id}>
            {g.words.join(", ")}{" "}
            <span className="muted">
              · {g.status}
              {g.importance != null && ` (${g.importance}/10)`} · {longDate(g.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
