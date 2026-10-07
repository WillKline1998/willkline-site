import Link from "next/link";
import type { Notice } from "@/generated/prisma/client";

const LABELS: Record<string, string> = {
  SHOW: "Upcoming show",
  RELEASE: "New release",
  NEWS: "News",
  NOTE: "Note",
};

const fmt = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });

// One post on the home-page bulletin board.
export function NoticeCard({ n }: { n: Notice }) {
  const external = n.linkHref?.startsWith("http");
  return (
    <article className={`notice notice-${n.kind.toLowerCase()}${n.pinned ? " notice-pinned" : ""}`}>
      <div className="notice-meta">
        <span className="notice-kind">{LABELS[n.kind] ?? n.kind}</span>
        {n.pinned && <span className="notice-pin">pinned</span>}
      </div>
      {n.eventDate && (
        <div className="notice-date">
          {fmt(n.eventDate)}
          {n.venue && <span className="notice-venue"> · {n.venue}</span>}
        </div>
      )}
      <h2 className="notice-title">{n.title}</h2>
      {n.body && <p className="notice-body">{n.body}</p>}
      {n.linkHref && (
        external ? (
          <a className="notice-link" href={n.linkHref} target="_blank" rel="noreferrer">{n.linkLabel ?? "More →"}</a>
        ) : (
          <Link className="notice-link" href={n.linkHref}>{n.linkLabel ?? "More →"}</Link>
        )
      )}
    </article>
  );
}
