import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { LabStatus, techList } from "@/components/LabStatus";

export const metadata: Metadata = { title: "Lab" };
export const dynamic = "force-dynamic";

export default async function LabPage() {
  const projects = await db.labProject.findMany({ where: { published: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  return (
    <section className="page page-wide">
      <h1 className="page-title">Lab</h1>
      <p className="lede">Experiments, tools, and works in progress, mostly where music meets code.</p>
      {projects.length === 0 ? (
        <p className="muted">The first experiments are on the way.</p>
      ) : (
        <ul className="lab-grid">
          {projects.map((p) => (
            <li key={p.id} className="lab-card">
              <LabStatus status={p.status} />
              <h2 className="lab-title">{p.body ? <Link href={`/lab/${p.slug}`}>{p.title}</Link> : p.title}</h2>
              {p.description && <p className="lab-desc">{p.description}</p>}
              {techList(p.tech).length > 0 && (
                <ul className="chips">{techList(p.tech).map((t) => <li key={t}>{t}</li>)}</ul>
              )}
              <p className="lab-links">
                {p.url && <a href={p.url} target="_blank" rel="noreferrer">Try it ↗</a>}
                {p.repoUrl && <a href={p.repoUrl} target="_blank" rel="noreferrer">Code ↗</a>}
                {p.body && <Link href={`/lab/${p.slug}`}>Read more →</Link>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
