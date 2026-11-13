import type { Metadata } from "next";
import Script from "next/script";
import { db } from "@/lib/db";
import { longDate } from "@/lib/dates";
import { readPattern, STAGE_BLURBS, studioMood } from "@/lib/dingdong";
import { openGraph } from "@/lib/seo";
import { PlayButton } from "./PlayButton";
import { Studio } from "./Studio";

const DESCRIPTION =
  "A tiny creature learning music from nothing, one day at a time. He writes a diary line and a little tune every morning.";
export const metadata: Metadata = {
  title: "Ding Dong",
  description: DESCRIPTION,
  openGraph: openGraph({ title: "Ding Dong", description: DESCRIPTION }),
};
// One small read per visit; nothing here ever calls the AI (the morning cron does that).
export const dynamic = "force-dynamic";

export default async function DingDongPage() {
  const days = await db.dingDongDay.findMany({ orderBy: { day: "desc" }, take: 400 });
  const stage = days[0]?.stage;
  const today = days[0] ?? null;
  const todayTune = today ? readPattern(today.pattern) : null;

  return (
    <section className="page dingdong">
      {/* Tone.js (MIT) plays the tunes. If it can't load, the diary still reads fine. */}
      <Script src="https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js" strategy="lazyOnload" />
      <h1 className="page-title">Ding Dong</h1>
      <p className="lede">A little guy who is learning music from scratch. One day at a time.</p>
      <Studio day={today?.day ?? null} pattern={todayTune} mood={studioMood(today, !!todayTune)} />

      <details className="dd-about">
        <summary>What is this?</summary>
        <p>
          Ding Dong started out knowing one sound: a ding. Every morning at 9 he wakes up, makes a short tune with what his ears can hear so
          far, and writes one line in his diary about it. Every few days his ears grow and he learns something new, like high and low, or
          long and short.
        </p>
        <p>
          He&apos;s written by an AI model and a small program I made, which decides when his ears grow, so he can&apos;t skip ahead. Press
          Play on any day to hear what he made. Nobody edits him.
        </p>
      </details>

      {stage && (
        <p className="dd-now">
          <span className="dd-badge">ear stage: {stage}</span>
          {STAGE_BLURBS[stage] && <span className="small muted">{STAGE_BLURBS[stage]}</span>}
        </p>
      )}

      {days.length === 0 ? (
        <p className="muted">He hasn&apos;t woken up yet. Check back tomorrow morning.</p>
      ) : (
        <ol className="dd-feed">
          {days.map((d, i) => {
            // The first week was simulated in one evening, so only show a date when it changes.
            const date = longDate(d.createdAt);
            const showDate = i === days.length - 1 || longDate(days[i + 1].createdAt) !== date;
            const pattern = readPattern(d.pattern);
            return (
              <li key={d.id} className="dd-day" id={`day-${d.day}`} data-day={d.day}>
                <header className="dd-day-head">
                  <span className="dd-day-num">Day {d.day}</span>
                  {showDate && <span className="small muted">{date}</span>}
                  <span className="dd-badge dd-badge-small">ear stage: {d.stage}</span>
                </header>
                <p className="dd-diary">{d.diary}</p>
                {d.tasteNote && <p className="dd-taste">noticed: {d.tasteNote}</p>}
                {pattern ? (
                  <PlayButton day={d.day} pattern={pattern} />
                ) : (
                  <p className="small muted dd-nosound">This day&apos;s tune got lost.</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
