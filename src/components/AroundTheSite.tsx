import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { longDate } from "@/lib/dates";
import { KIND_LABEL } from "@/lib/music";
import { WALL_KINDS, type WallKind } from "@/lib/wall";

const short = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" });
const time = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });

function Box({ label, href, children }: { label: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="rail-box">
      <h2 className="rail-label">{href ? <Link href={href}>{label} →</Link> : label}</h2>
      {children}
    </section>
  );
}

// The home page's right rail: newest things from every section, pulled
// automatically so the front page stays current without extra posting.
// Each box hides itself when its section is empty.
export async function AroundTheSite() {
  const now = new Date();
  const [shows, album, post, media, finds, lab] = await Promise.all([
    db.notice.findMany({ where: { published: true, kind: "SHOW", eventDate: { gte: now } }, orderBy: { eventDate: "asc" }, take: 3 }),
    db.album.findFirst({ where: { published: true }, orderBy: { sortOrder: "asc" } }),
    db.post.findFirst({ where: { published: true }, orderBy: { publishedAt: "desc" } }),
    db.mediaItem.findFirst({ where: { published: true }, orderBy: { createdAt: "desc" } }),
    db.wallPost.findMany({ where: { hidden: false }, orderBy: { createdAt: "desc" }, take: 3, include: { author: { select: { handle: true } } } }),
    db.labProject.findFirst({ where: { published: true }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <aside className="rail" aria-label="Around the site">
      {shows.length > 0 && (
        <Box label="Upcoming">
          <ul className="rail-shows">
            {shows.map((s) => (
              <li key={s.id}>
                <span className="cal" aria-hidden>
                  <span className="cal-m">{s.eventDate!.toLocaleDateString("en-US", { month: "short", timeZone: "America/New_York" })}</span>
                  <span className="cal-d">{s.eventDate!.toLocaleDateString("en-US", { day: "numeric", timeZone: "America/New_York" })}</span>
                </span>
                <span>
                  <strong>{s.title}</strong>
                  <span className="rail-sub">{short(s.eventDate!)} · {time(s.eventDate!)}{s.venue && ` · ${s.venue}`}</span>
                </span>
              </li>
            ))}
          </ul>
        </Box>
      )}

      {album && (
        <Box label="Latest release" href="/music">
          <Link href={`/music/${album.slug}`} className="rail-release">
            {album.coverUrl && <Image src={album.coverUrl} alt="" width={72} height={72} className="rail-cover" />}
            <span>
              <strong>{album.title}</strong>
              <span className="rail-sub">{KIND_LABEL[album.kind] ?? album.kind}{album.year ? ` · ${album.year}` : ""}</span>
            </span>
          </Link>
        </Box>
      )}

      {post && (
        <Box label="Writing" href="/writing">
          <Link href={`/writing/${post.slug}`} className="rail-link">
            <strong>{post.title}</strong>
            {post.publishedAt && <span className="rail-sub">{longDate(post.publishedAt)}</span>}
          </Link>
        </Box>
      )}

      {media && (
        <Box label="Media" href="/media">
          <Link href="/media" className="rail-link">
            {media.kind === "PHOTO" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.url} alt={media.title || "Latest photo"} className="rail-photo" loading="lazy" />
            ) : (
              <strong>▶ {media.title || "New video"}</strong>
            )}
            {media.kind === "PHOTO" && media.title && <span className="rail-sub">{media.title}</span>}
          </Link>
        </Box>
      )}

      {finds.length > 0 && (
        <Box label="From the Inspiration Wall" href="/wall">
          <ul className="rail-finds">
            {finds.map((f) => (
              <li key={f.id}>
                <a href={f.url} target="_blank" rel="noreferrer">{f.title}</a>
                <span className="rail-sub">{WALL_KINDS[f.kind as WallKind] ?? f.kind}{f.author.handle && ` · @${f.author.handle}`}</span>
              </li>
            ))}
          </ul>
        </Box>
      )}

      {lab && (
        <Box label="In the Lab" href="/lab">
          <Link href={lab.body ? `/lab/${lab.slug}` : "/lab"} className="rail-link">
            <strong>{lab.title}</strong>
            {lab.description && <span className="rail-sub">{lab.description}</span>}
          </Link>
        </Box>
      )}
    </aside>
  );
}
