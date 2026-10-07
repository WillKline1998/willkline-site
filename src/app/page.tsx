import { db } from "@/lib/db";
import { NoticeCard } from "@/components/NoticeCard";

// Always reflect the latest posts (Will edits these from the admin page in M3).
export const dynamic = "force-dynamic";

// Home = bulletin board, not a hero photo. Pinned first, then newest.
export default async function Home() {
  const notices = await db.notice.findMany({
    where: { published: true },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    include: { media: { orderBy: { position: "asc" } } },
  });

  return (
    <section className="page">
      <header className="home-header">
        <h1 className="page-title">Will Kline</h1>
        <p className="lede">Bassist, composer, and software engineer in Cleveland, Ohio.</p>
      </header>
      <h2 className="section-label">Bulletin</h2>
      <div className="notices">
        {notices.map((n) => <NoticeCard key={n.id} n={n} />)}
        {notices.length === 0 && <p className="muted">Nothing posted yet.</p>}
      </div>
    </section>
  );
}
