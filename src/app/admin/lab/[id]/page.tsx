import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteProject, saveProject } from "../actions";

export const metadata: Metadata = { title: "Edit project · Admin" };
export const dynamic = "force-dynamic";

export default async function EditProject(props: PageProps<"/admin/lab/[id]">) {
  const { id } = await props.params;
  await requireAdmin(`/admin/lab/${id}`);
  const p = await db.labProject.findUnique({ where: { id } });
  if (!p) notFound();
  return (
    <section className="page" style={{ maxWidth: 900 }}>
      <p className="small"><Link href="/admin/lab">← Lab</Link>{p.published && <> · <Link href={`/lab/${p.slug}`}>View</Link></>}</p>
      <h1 className="page-title">Edit project</h1>
      <form action={saveProject} className="admin-form" style={{ maxWidth: "none" }}>
        <input type="hidden" name="id" value={p.id} />
        <label>Name<input type="text" name="title" defaultValue={p.title} required /></label>
        <label>Web address: willkline.net/lab/…<input type="text" name="slug" defaultValue={p.slug} /></label>
        <label>
          Status
          <select name="status" defaultValue={p.status}>
            <option value="IDEA">Idea</option>
            <option value="BUILDING">In progress</option>
            <option value="LIVE">Live</option>
          </select>
        </label>
        <label>One-line description (shown on the card)<input type="text" name="description" defaultValue={p.description} /></label>
        <label>Tools / tech, comma-separated<input type="text" name="tech" defaultValue={p.tech} placeholder="Max/MSP, Web Audio, TypeScript" /></label>
        <label>Live link (optional)<input type="url" name="url" defaultValue={p.url ?? ""} /></label>
        <label>Code link (optional)<input type="url" name="repoUrl" defaultValue={p.repoUrl ?? ""} /></label>
        <label>Write-up (optional; adds a &quot;Read more&quot; page). Same formatting as Writing posts.<textarea name="body" rows={14} defaultValue={p.body} /></label>
        <div className="inline-form">
          <label>Order <input type="number" name="sortOrder" defaultValue={p.sortOrder} style={{ width: 70 }} /></label>
          <label><input type="checkbox" name="published" defaultChecked={p.published} /> Visible on site</label>
        </div>
        <button className="btn">Save</button>
      </form>
      <form action={deleteProject} style={{ marginTop: "2rem" }}>
        <input type="hidden" name="id" value={p.id} />
        <button className="btn btn-danger">Delete this project</button>
      </form>
    </section>
  );
}
