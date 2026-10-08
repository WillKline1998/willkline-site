import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Markdown } from "@/components/Markdown";
import { LabStatus, techList } from "@/components/LabStatus";

export const dynamic = "force-dynamic";

const load = (slug: string) => db.labProject.findFirst({ where: { slug, published: true } });

export async function generateMetadata(props: PageProps<"/lab/[slug]">): Promise<Metadata> {
  const p = await load((await props.params).slug);
  return p ? { title: p.title, description: p.description || undefined } : {};
}

export default async function LabProjectPage(props: PageProps<"/lab/[slug]">) {
  const p = await load((await props.params).slug);
  if (!p) notFound();
  return (
    <article className="page">
      <p className="small"><Link href="/lab">← Lab</Link></p>
      <LabStatus status={p.status} />
      <h1 className="page-title">{p.title}</h1>
      {p.description && <p className="lede">{p.description}</p>}
      {techList(p.tech).length > 0 && <ul className="chips">{techList(p.tech).map((t) => <li key={t}>{t}</li>)}</ul>}
      <p className="lab-links">
        {p.url && <a href={p.url} target="_blank" rel="noreferrer">Try it ↗</a>}
        {p.repoUrl && <a href={p.repoUrl} target="_blank" rel="noreferrer">Code ↗</a>}
      </p>
      <Markdown>{p.body}</Markdown>
    </article>
  );
}
