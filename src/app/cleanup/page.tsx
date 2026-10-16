import type { Metadata } from "next";
import Link from "next/link";
import { CleanupMap } from "@/components/CleanupMap";
import { FlyButton } from "@/components/FlyButton";
import { currentUser } from "@/lib/auth";
import { communityStats, displayName, recentCleanups } from "@/lib/cleanup";
import { HIDE_ENDS_M, formatKm, formatMiles } from "@/lib/geo";
import { openGraph } from "@/lib/seo";
import { signupsOpen } from "@/lib/wall";

const DESCRIPTION = "A map of where people have picked up litter, drawn by the people who did it.";
export const metadata: Metadata = { title: "Cleanup Map", description: DESCRIPTION, openGraph: openGraph({ title: "Cleanup Map", description: DESCRIPTION }) };
export const dynamic = "force-dynamic";

export default async function CleanupPage(props: PageProps<"/cleanup">) {
  const sp = await props.searchParams;
  const [viewer, stats, recent, open] = await Promise.all([currentUser(), communityStats(), recentCleanups(12), signupsOpen()]);
  const numbers: [string, string, string?][] = [
    [formatMiles(stats.meters), "cleaned on foot", stats.meters ? formatKm(stats.meters) : undefined],
    [String(stats.cleanups), stats.cleanups === 1 ? "clean-up" : "clean-ups"],
    [String(stats.members), stats.members === 1 ? "person" : "people"],
    [String(stats.bags), stats.bags === 1 ? "bag filled" : "bags filled"],
  ];

  return (
    <section className="page page-wide cleanup">
      <p className="cleanup-concept">A concept page: what a community clean-up site could look like.</p>
      <h1 className="page-title">Cleanup Map</h1>
      <p className="lede">Everyone who picks up litter, on one map. Draw the street or trail you cleaned and watch the miles add up.</p>
      {sp.added === "1" && <p className="admin-note" role="status">Added. Thank you, that stretch is cleaner because of you.</p>}

      <dl className="cleanup-stats" aria-label="Totals so far">
        {numbers.map(([n, label, sub]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{n}{sub && <small>{sub}</small>}</dd>
          </div>
        ))}
      </dl>

      <CleanupMap />

      <p className="wall-cta">
        {viewer ? (
          <>
            <Link href="/cleanup/new" className="btn">+ Add a clean-up</Link>
            <Link href="/cleanup/mine" className="btn btn-quiet">Your clean-ups</Link>
          </>
        ) : (
          <>
            <Link href="/login?next=/cleanup/new" className="btn">Log in to add one</Link>
            {open && <Link href="/signup" className="btn btn-quiet">Join</Link>}
          </>
        )}
      </p>

      <h2 className="section-label">Recent</h2>
      {recent.length === 0 ? (
        <p className="muted">Nothing on the map yet. The first line drawn here is yours.</p>
      ) : (
        <ul className="cleanup-list">
          {recent.map((c) => (
            <li key={c.id}>
              <FlyButton bounds={[[c.minLng, c.minLat], [c.maxLng, c.maxLat]]}>
                <strong>{c.title}</strong>
                <span className="muted small">
                  {displayName(c.author)} · {c.cleanedOn.toISOString().slice(0, 10)} · {formatMiles(c.distanceM)}
                  {c.bags ? ` · ${c.bags} bag${c.bags === 1 ? "" : "s"}` : ""}
                </span>
              </FlyButton>
            </li>
          ))}
        </ul>
      )}

      <h2 className="section-label">How it works</h2>
      <ul className="cleanup-how">
        <li><strong>Draw it.</strong> Tap the corners you walked and the line follows the streets, or draw freehand across a park or trail.</li>
        <li><strong>Keep your home private.</strong> The first and last {HIDE_ENDS_M} m of every route are cut off before anything is saved, and you can keep any clean-up fully private.</li>
        <li><strong>Watch it add up.</strong> Everyone&apos;s miles count toward one total.</li>
      </ul>
      <p className="small muted">Map: © OpenStreetMap contributors, tiles by OpenFreeMap; street routing by the OpenStreetMap community (FOSSGIS). Distances are measured along the line you draw.{process.env.CONTACT_EMAIL ? <> Questions about this map: <a href={`mailto:${process.env.CONTACT_EMAIL}`}>{process.env.CONTACT_EMAIL}</a>.</> : null}</p>
    </section>
  );
}
