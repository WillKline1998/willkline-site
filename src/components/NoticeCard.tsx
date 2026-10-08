import Link from "next/link";
import type { Notice, NoticeMedia } from "@/generated/prisma/client";
import { MediaBlock } from "@/components/MediaBlock";

const LABELS: Record<string, string> = {
  SHOW: "Upcoming show",
  RELEASE: "New release",
  NEWS: "News",
  NOTE: "Note",
};

const fmt = (d: Date) =>
  d.toLocaleString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

// One post on the home-page bulletin board.
export function NoticeCard({ n }: { n: Notice & { media: NoticeMedia[] } }) {
  const external = n.linkHref?.startsWith("http");
  return (
    <article className={`notice notice-${n.kind.toLowerCase()}${n.pinned ? " notice-pinned" : ""}`}>
      <div className="notice-meta">
        <span className="notice-kind">{LABELS[n.kind] ?? n.kind}</span>
        {n.pinned && <span className="notice-pin">pinned</span>}
        <time className="notice-posted" dateTime={n.createdAt.toISOString()}>
          {n.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" })}
        </time>
      </div>
      {n.eventDate && (
        <div className="notice-date">
          {fmt(n.eventDate)}
          {n.venue && <span className="notice-venue"> · {n.venue}</span>}
        </div>
      )}
      <h2 className="notice-title">{n.title}</h2>
      {n.body && <p className="notice-body">{n.body}</p>}
      {n.media.length > 0 && (
        <div className="notice-media">
          {n.media.map((m) => <MediaBlock key={m.id} m={m} />)}
        </div>
      )}
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
