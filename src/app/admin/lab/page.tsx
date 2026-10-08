import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { LabStatus } from "@/components/LabStatus";
import { createProject } from "./actions";

export const metadata: Metadata = { title: "Lab · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminLab() {
  await requireAdmin("/admin/lab");
  const projects = await db.labProject.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <section className="page" style={{ maxWidth: 900 }}>
      <p className="small"><Link href="/admin">← Admin</Link> · <Link href="/lab">View Lab page</Link></p>
      <h1 className="page-title">Lab</h1>
      <form action={createProject} className="admin-form">
        <label>New project name<input type="text" name="title" required /></label>
        <button className="btn">Add project (starts hidden)</button>
      </form>
      <h2 className="section-label">Projects</h2>
      {projects.length === 0 && <p className="muted">No projects yet.</p>}
      <table className="admin-table">
        <tbody>
          {projects.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/admin/lab/${p.id}`}>{p.title}</Link></td>
              <td><LabStatus status={p.status} /></td>
              <td className="small muted">{p.published ? "visible" : "hidden"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
