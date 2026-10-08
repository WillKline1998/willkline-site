import { db } from "@/lib/db";
import { NoticeCard } from "@/components/NoticeCard";
import { AroundTheSite } from "@/components/AroundTheSite";

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

  return (
    <section className="page home">
      <header className="home-header">
        <h1 className="home-title">Will Kline</h1>
        <p className="lede">Bassist, composer, and software engineer in Cleveland, Ohio.</p>
      </header>
      <div className="home-grid">
        <div className="home-main">
          <h2 className="section-label">Bulletin</h2>
          <div className="notices">
            {notices.map((n) => <NoticeCard key={n.id} n={n} />)}
            {notices.length === 0 && <p className="muted">Nothing posted yet.</p>}
          </div>
        </div>
        <AroundTheSite />
      </div>
    </section>
  );
}
