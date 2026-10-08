import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getJsonSetting } from "@/lib/settings";
import type { Cv } from "@/lib/cv";
import { saveCvForm } from "./actions";

export const metadata: Metadata = { title: "CV · Admin" };
export const dynamic = "force-dynamic";

const EMPTY: Cv = { name: "Will Kline", contact: [], summary: "", experience: [], music: [], education: [], skills: [] };

// Section-by-section CV editor (no JSON). One form; every button saves.
export default async function AdminCv(props: PageProps<"/admin/cv">) {
  await requireAdmin("/admin/cv");
  const saved = (await props.searchParams).saved === "1";
  const cv = await getJsonSetting<Cv>("cv", EMPTY);

  return (
    <section className="page" style={{ maxWidth: 900 }}>
      <p className="small"><Link href="/admin">← Admin</Link> · <Link href="/cv">View CV page</Link></p>
      <h1 className="page-title">CV</h1>
      {saved && <p className="admin-note" role="status">Saved ✓ The CV page is updated.</p>}
      <p className="lede">The downloadable PDFs are separate: <Link href="/admin/documents">Documents</Link>.</p>

      <form action={saveCvForm} className="cv-form">
        <fieldset className="admin-form" style={{ maxWidth: "none" }}>
          <legend className="section-label">Top</legend>
          <label>Summary<textarea name="summary" rows={4} defaultValue={cv.summary} /></label>
          <label>Contact lines (one per line; emails and LinkedIn/GitHub become links)<textarea name="contact" rows={4} defaultValue={cv.contact.join("\n")} /></label>
        </fieldset>

        <h2 className="section-label" id="experience">Experience</h2>
        {cv.experience.map((e, i) => (
          <fieldset key={i} className="admin-form cv-entry-form" style={{ maxWidth: "none" }}>
            <div className="cv-form-row">
              <label>Title<input type="text" name={`exp.${i}.title`} defaultValue={e.title} /></label>
              <label>Organization<input type="text" name={`exp.${i}.org`} defaultValue={e.org} /></label>
            </div>
            <div className="cv-form-row">
              <label>Location<input type="text" name={`exp.${i}.location`} defaultValue={e.location} /></label>
              <label>Dates<input type="text" name={`exp.${i}.dates`} defaultValue={e.dates} placeholder="Jan 2024 – Present" /></label>
            </div>
            <label>Note (optional)<input type="text" name={`exp.${i}.note`} defaultValue={e.note ?? ""} /></label>
            <label>Bullet points (one per line)<textarea name={`exp.${i}.bullets`} rows={Math.max(3, e.bullets.length + 1)} defaultValue={e.bullets.join("\n")} /></label>
            <div className="inline-form">
              <label>Order <input type="number" name={`exp.${i}.order`} defaultValue={i + 1} style={{ width: 70 }} /></label>
              <label><input type="checkbox" name={`exp.${i}.remove`} /> Remove this job</label>
            </div>
          </fieldset>
        ))}
        <button className="btn btn-quiet" name="intent" value="add-exp">+ Add a job</button>

        <fieldset className="admin-form" style={{ maxWidth: "none", marginTop: "1rem" }}>
          <label>Additional experience (one short paragraph, optional)<textarea name="additional_experience" rows={3} defaultValue={cv.additional_experience ?? ""} /></label>
        </fieldset>

        <h2 className="section-label">Music</h2>
        <fieldset className="admin-form" style={{ maxWidth: "none" }}>
          <label>One item per line<textarea name="music" rows={Math.max(4, cv.music.length + 2)} defaultValue={cv.music.join("\n")} /></label>
        </fieldset>

        <h2 className="section-label" id="education">Education</h2>
        {cv.education.map((e, i) => (
          <fieldset key={i} className="admin-form cv-entry-form" style={{ maxWidth: "none" }}>
            <div className="cv-form-row">
              <label>School<input type="text" name={`edu.${i}.school`} defaultValue={e.school} /></label>
              <label>Dates<input type="text" name={`edu.${i}.dates`} defaultValue={e.dates} /></label>
            </div>
            <label>Degree / details<input type="text" name={`edu.${i}.detail`} defaultValue={e.detail} /></label>
            <label>Location<input type="text" name={`edu.${i}.location`} defaultValue={e.location} /></label>
            <div className="inline-form">
              <label>Order <input type="number" name={`edu.${i}.order`} defaultValue={i + 1} style={{ width: 70 }} /></label>
              <label><input type="checkbox" name={`edu.${i}.remove`} /> Remove</label>
            </div>
          </fieldset>
        ))}
        <button className="btn btn-quiet" name="intent" value="add-edu">+ Add a school</button>

        <h2 className="section-label">Skills</h2>
        <fieldset className="admin-form" style={{ maxWidth: "none" }}>
          <label>One per line, as &quot;Label: list&quot;<textarea name="skills" rows={Math.max(3, cv.skills.length + 1)} defaultValue={cv.skills.map(([k, v]) => `${k}: ${v}`).join("\n")} /></label>
        </fieldset>

        <div className="cv-save-bar">
          <button className="btn">Save CV</button>
          <Link href="/admin/cv/raw" className="small cv-raw-link">Advanced (raw)</Link>
        </div>
      </form>
    </section>
  );
}
