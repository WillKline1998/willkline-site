import Link from "next/link";
import type { User, WallPost } from "@/generated/prisma/client";
import { MediaBlock } from "@/components/MediaBlock";
import { toEmbed } from "@/lib/embeds";
import { IMAGE_URL, WALL_KINDS, type WallKind } from "@/lib/wall";
import { deleteWallPost, reportWallPost, toggleSave } from "@/app/wall/actions";

export type WallPostView = WallPost & { author: Pick<User, "handle" | "name">; _count: { saves: number } };

function Preview({ url, title }: { url: string; title: string }) {
  if (IMAGE_URL.test(url))
    return (
      <a href={url} target="_blank" rel="noreferrer" className="wall-image">
        {/* External art: plain <img>, no referrer leaked to the host. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={title} loading="lazy" referrerPolicy="no-referrer" />
      </a>
    );
  if (toEmbed(url).kind !== "link") return <MediaBlock m={{ kind: "EMBED", url, caption: "" }} />;
  return <MediaBlock m={{ kind: "LINK", url, caption: title }} />;
}

// One find on the Wall. `viewer` decides which buttons show.
export function WallCard({ p, viewer, saved }: { p: WallPostView; viewer: { id: string; role: string } | null; saved: boolean }) {
  const mine = viewer?.id === p.authorId;
  return (
    <article className="wall-card">
      <Preview url={p.url} title={p.title} />
      <div className="wall-body">
        <span className="notice-kind">{WALL_KINDS[p.kind as WallKind] ?? p.kind}</span>
        <h2 className="wall-title">{p.title}</h2>
        {p.note && <p className="wall-note">{p.note}</p>}
        <p className="wall-meta">
          {p.author.handle ? <Link href={`/wall/u/${p.author.handle}`}>@{p.author.handle}</Link> : p.author.name}
          {" · "}
          {p.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {p.hidden && <strong className="form-error"> · hidden</strong>}
        </p>
        <div className="wall-actions">
          {viewer ? (
            <form action={toggleSave}>
              <input type="hidden" name="id" value={p.id} />
              <button className={`btn ${saved ? "" : "btn-quiet"}`} aria-pressed={saved}>
                {saved ? "★ Saved" : "☆ Save"} {p._count.saves > 0 && <span className="save-count">{p._count.saves}</span>}
              </button>
            </form>
          ) : (
            <Link href="/login?next=/wall" className="btn btn-quiet">☆ Save {p._count.saves > 0 && p._count.saves}</Link>
          )}
          {(mine || viewer?.role === "ADMIN") && (
            <form action={deleteWallPost}>
              <input type="hidden" name="id" value={p.id} />
              <button className="btn btn-danger">Delete</button>
            </form>
          )}
          {viewer && !mine && (
            <form action={reportWallPost}>
              <input type="hidden" name="id" value={p.id} />
              <button className="link-button small muted" title="Report this post">Report</button>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
