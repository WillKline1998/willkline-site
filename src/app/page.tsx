import { db } from "@/lib/db";
import { NoticeCard } from "@/components/NoticeCard";
import { AroundTheSite } from "@/components/AroundTheSite";
import { getSetting } from "@/lib/settings";

// Always reflect the latest posts (Will edits these from the admin).
export const dynamic = "force-dynamic";

// Home = a bulletin board, not a hero photo: Will's posts (pinned first, then
// newest) beside an auto-updating rail of what's new around the site.
export default async function Home() {
  const notices = await db.notice.findMany({
    where: { published: true },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    include: { media: { orderBy: { position: "asc" } } },
  });
  // Optional picture above the first post (SiteSetting "home_photo", set on /admin/home). None = nothing rendered.
  const [photo, alt] = await Promise.all([
    getSetting("home_photo"),
    getSetting("home_photo_alt"),
  ]);

  return (
    <section className="page home">
      <header className="home-header">
        <h1 className="home-title">Will Kline</h1>
        <p className="lede">
          Bassist, composer, and software engineer in Cleveland, Ohio.
        </p>
      </header>
      <div className="home-grid">
        <div className="home-main">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={alt} className="home-photo" />
          )}
          <h2 className="section-label">Bulletin</h2>
          <div className="notices">
            {notices.map((n) => (
              <NoticeCard key={n.id} n={n} />
            ))}
            {notices.length === 0 && (
              <p className="muted">Nothing posted yet.</p>
            )}
          </div>
        </div>
        <AroundTheSite />
      </div>
    </section>
  );
}
