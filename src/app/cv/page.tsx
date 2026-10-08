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

          <h2 className="section-label">Experience</h2>
          {cv.experience.filter((e) => e.title || e.org).map((e) => (
            <div key={e.title + e.org} className="cv-entry">
              <div className="cv-row">
                <h3>{e.title}, <span className="cv-org">{e.org}</span></h3>
                <span className="cv-dates">{e.dates}</span>
              </div>
              <p className="cv-meta">{e.location}{e.note ? ` · ${e.note}` : ""}</p>
              <ul>{e.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
          ))}
          {cv.additional_experience && <p className="cv-meta">{cv.additional_experience}</p>}

          <h2 className="section-label">Music</h2>
          <ul className="cv-list">{cv.music.map((m, i) => <li key={i}>{m}</li>)}</ul>

          <h2 className="section-label">Education</h2>
          {cv.education.filter((e) => e.school).map((e) => (
            <div key={e.school} className="cv-entry">
              <div className="cv-row">
                <h3>{e.school}</h3>
                <span className="cv-dates">{e.dates}</span>
              </div>
              <p className="cv-meta">{e.detail}</p>
            </div>
          ))}

          <h2 className="section-label">Skills</h2>
          <dl className="cv-skills">
            {cv.skills.filter(([, v]) => v).map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </>
      )}
    </section>
  );
}
