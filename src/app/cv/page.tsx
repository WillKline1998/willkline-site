import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getJsonSetting } from "@/lib/settings";
import type { Cv } from "@/lib/cv";
import { DocumentList } from "@/components/DocumentList";

export const metadata: Metadata = { title: "CV" };
export const dynamic = "force-dynamic";

const linkFor = (c: string) =>
  c.includes("@") ? `mailto:${c}` : /^(linkedin|github)\.com\//.test(c) ? `https://${c}` : null;

// The page IS the CV; downloads (résumé, CV, anything uploaded) sit on top.
export default async function CvPage() {
  const [cv, docs] = await Promise.all([
    getJsonSetting<Cv | null>("cv", null),
    db.document.findMany({ where: { published: true }, orderBy: [{ sortOrder: "asc" }, { uploadedAt: "asc" }] }),
  ]);

  return (
    <section className="page cv">
      <h1 className="page-title">CV</h1>
      {cv && (
        <p className="cv-contact">
          {cv.contact.filter((c) => !/^cleveland/i.test(c)).map((c, i) => {
            const href = linkFor(c);
            return <span key={i}>{href ? <a href={href}>{c}</a> : c}</span>;
          })}
        </p>
      )}

      {docs.length > 0 && (
        <>
          <h2 className="section-label">Download</h2>
          <DocumentList docs={docs} />
        </>
      )}

      {!cv ? (
        <p className="muted">CV coming soon.</p>
      ) : (
        <>
          <p className="cv-summary">{cv.summary}</p>

          <h2 className="cv-heading">Experience</h2>
          {cv.experience.filter((e) => e.title || e.org).map((e) => (
            <CvItem key={e.title + e.org} dates={e.dates} title={e.title} sub={e.org} meta={[e.location, e.note].filter(Boolean).join(" · ")}>
              {e.bullets.length > 0 && <ul className="cv-bullets">{e.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}
            </CvItem>
          ))}
          {cv.additional_experience && (
            <CvItem title="Additional experience">
              <p className="cv-text">{cv.additional_experience}</p>
            </CvItem>
          )}

          <h2 className="cv-heading">Music</h2>
          {cv.music.map((line, i) => {
            const m = splitMusicLine(line);
            return (
              <CvItem key={i} dates={m.dates} title={m.lead}>
                {m.rest && <p className="cv-text">{m.rest}</p>}
              </CvItem>
            );
          })}

          <h2 className="cv-heading">Education</h2>
          {cv.education.filter((e) => e.school).map((e) => (
            <CvItem key={e.school} dates={e.dates} title={e.school} meta={e.location}>
              <ul className="cv-lines">{e.detail.split(" · ").map((d, i) => <li key={i}>{d}</li>)}</ul>
            </CvItem>
          ))}

          <h2 className="cv-heading">Skills</h2>
          {cv.skills.filter(([, v]) => v).map(([k, v]) => (
            <CvItem key={k} title={k}>
              <ul className="chips cv-chips">{v.split(/,\s*/).map((s) => <li key={s}>{s}</li>)}</ul>
            </CvItem>
          ))}
        </>
      )}
    </section>
  );
}

// One CV row: dates in a left column (on wide screens), then a bold title,
// an optional organization line, quiet meta, and details.
function CvItem(props: { dates?: string; title: string; sub?: string; meta?: string; children?: React.ReactNode }) {
  return (
    <div className="cv-item">
      <div className="cv-when">{props.dates}</div>
      <div className="cv-what">
        <h3 className="cv-title">{props.title}</h3>
        {props.sub && <p className="cv-sub">{props.sub}</p>}
        {props.meta && <p className="cv-meta">{props.meta}</p>}
        {props.children}
      </div>
    </div>
  );
}

/** "Role, Ensemble (2019–2022): details" → { lead, dates, rest }; "Label: details" → { lead, rest }. */
function splitMusicLine(line: string) {
  const dated = line.match(/^(.+?)\s*\(([^()]*\d{4}[^()]*)\)(?::\s*([\s\S]*)|\.?)$/);
  if (dated) return { lead: dated[1], dates: dated[2], rest: dated[3] ?? "" };
  const at = line.indexOf(": ");
  if (at > 0 && at < 60) return { lead: line.slice(0, at), dates: "", rest: line.slice(at + 2) };
  return { lead: line.replace(/\.$/, ""), dates: "", rest: "" };
}
