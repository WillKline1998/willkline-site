import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { db } from "@/lib/db";
import { longDate } from "@/lib/dates";
import { readPattern, STAGE_BLURBS, studioMood } from "@/lib/dingdong";
import { dingDongWantsAndGifts } from "@/lib/dingdong-gifts";
import { GiftBox } from "./GiftBox";
import { openGraph } from "@/lib/seo";
import { PlayButton } from "./PlayButton";
import { Studio } from "./Studio";
import { Trough } from "./Trough";

const DESCRIPTION =
  "A tiny creature learning music from nothing, one day at a time. He writes a diary line and a little tune every morning.";
export const metadata: Metadata = {
  title: "DingDong",
  description: DESCRIPTION,
  openGraph: openGraph({ title: "DingDong", description: DESCRIPTION }),
};
// One small read per visit; nothing here ever calls the AI (the morning cron does that).
export const dynamic = "force-dynamic";

// How a stage reads in "3 days of dings". Pulse is the plain ding; the rest read fine as they are.
const SKILL_NOUN: Record<string, string> = { pulse: "dings" };
const STAGE_ORDER = Object.keys(STAGE_BLURBS);

export default async function DingDongPage(props: { searchParams: Promise<{ skill?: string | string[] }> }) {
  const sp = await props.searchParams;
  const [allDays, { wants, waiting }] = await Promise.all([
    db.dingDongDay.findMany({ orderBy: { day: "desc" }, take: 400 }),
    dingDongWantsAndGifts(),
  ]);
  const stage = allDays[0]?.stage;
  const today = allDays[0] ?? null;
  // Skills he has actually reached, in the order his ears grew (first day seen at each stage).
  const skills = new Map<string, { n: number; first: number; last: number }>();
  for (const d of allDays) {
    const s = skills.get(d.stage) ?? { n: 0, first: d.day, last: d.day };
    skills.set(d.stage, { n: s.n + 1, first: Math.min(s.first, d.day), last: Math.max(s.last, d.day) });
  }
  const skillList = [...skills.entries()].sort((a, b) => a[1].first - b[1].first || STAGE_ORDER.indexOf(a[0]) - STAGE_ORDER.indexOf(b[0]));
  const rawSkill = Array.isArray(sp.skill) ? sp.skill[0] : sp.skill;
  const skill = rawSkill && skills.has(rawSkill) ? rawSkill : null;
  const days = skill ? allDays.filter((d) => d.stage === skill) : allDays;
  const picked = skill ? skills.get(skill)! : null;
  const todayTune = today ? readPattern(today.pattern) : null;

  return (
    <section className="page dingdong">
      {/* Tone.js (MIT) plays the tunes. If it can't load, the diary still reads fine. */}
      <Script src="https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js" strategy="lazyOnload" />
      <h1 className="page-title">DingDong</h1>
      <p className="lede">A little guy who is learning music from scratch. One day at a time.</p>
      <Studio day={today?.day ?? null} pattern={todayTune} mood={studioMood(today, !!todayTune)} />

      <details className="dd-about">
        <summary>
          What is this?
          <span className="dd-about-icon" aria-hidden="true" />
        </summary>
        <p>
          DingDong started out knowing one sound: a ding. Every morning at 9 he wakes up, makes a short tune with what his ears can hear so
          far, and writes one line in his diary about it. Every few days his ears grow and he learns something new, like high and low, or
          long and short.
        </p>
        <p>
          He&apos;s written by an AI model and a small program I made, which decides when his ears grow, so he can&apos;t skip ahead. Press
          Play on any day to hear what he made. Nobody edits him.
        </p>
        <p>
          You can leave him a word from a short list. He doesn&apos;t really hear anything: he reads the words, and if one keeps coming up
          he may start asking for it. A program counts how often he notices things, so he can&apos;t talk himself into wanting stuff. I
          decide what he gets.
        </p>
      </details>

      {stage && (
        <p className="dd-now">
          <span className="dd-badge">ear stage: {stage}</span>
          {STAGE_BLURBS[stage] && <span className="small muted">{STAGE_BLURBS[stage]}</span>}
        </p>
      )}

      <Trough wants={wants} />
      <GiftBox waiting={waiting} />

      {skillList.length > 1 && (
        <nav className="wall-filters dd-skills" aria-label="Filter days by ear skill">
          <Link href="/dingdong" scroll={false} aria-current={!skill ? "page" : undefined}>
            All days <span className="muted">{allDays.length}</span>
          </Link>
          {skillList.map(([s, info]) => (
            <Link
              key={s}
              href={`/dingdong?skill=${encodeURIComponent(s)}`}
              scroll={false}
              aria-current={skill === s ? "page" : undefined}
              data-skill={s}
            >
              {s} <span className="muted">{info.n}</span>
            </Link>
          ))}
        </nav>
      )}
      {skill && picked && (
        <p className="small muted dd-skill-status" data-count={picked.n}>
          <strong>
            {picked.n} {picked.n === 1 ? "day" : "days"} of {SKILL_NOUN[skill] ?? skill}
          </strong>{" "}
          · {picked.first === picked.last ? `day ${picked.first}` : `days ${picked.first}–${picked.last}`}
          {STAGE_BLURBS[skill] && <> · {STAGE_BLURBS[skill]}</>} · <Link href="/dingdong">Show every day</Link>
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
                {d.giftNote && <p className="dd-taste dd-giftnote">about your gifts: {d.giftNote}</p>}
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
