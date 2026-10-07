import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fileUrl, formatBytes } from "@/lib/storage";
import { createDocument, deleteDocument, replaceFile, updateDetails } from "./actions";

export const metadata: Metadata = { title: "Documents · Admin" };
export const dynamic = "force-dynamic";

// Upload / replace / rename / reorder / hide downloadable documents.
// Everything published here shows up on /cv immediately (no redeploy).
export default async function AdminDocuments() {
  await requireAdmin("/admin/documents");
  const docs = await db.document.findMany({ orderBy: [{ sortOrder: "asc" }, { uploadedAt: "asc" }] });

  return (
    <section className="page" style={{ maxWidth: 900 }}>
      <p className="small"><Link href="/admin">← Admin</Link></p>
      <h1 className="page-title">Documents</h1>
      <p className="lede">Shown as downloads on the <Link href="/cv">CV page</Link>, in this order.</p>

      <table className="admin-table">
        <tbody>
          {docs.map((d) => (
            <tr key={d.id}>
              <td>
                <form action={updateDetails} className="inline-form" style={{ flexWrap: "wrap" }}>
                  <input type="hidden" name="id" value={d.id} />
                  <input type="number" name="sortOrder" defaultValue={d.sortOrder} style={{ width: 56 }} aria-label="Order" />
                  <input type="text" name="title" defaultValue={d.title} aria-label="Title" required />
                  <input type="text" name="description" defaultValue={d.description} placeholder="Description (optional)" aria-label="Description" />
                  <label className="small"><input type="checkbox" name="published" defaultChecked={d.published} /> visible</label>
                  <button className="btn btn-quiet">Save</button>
                </form>
                <div className="small muted">
                  <a href={fileUrl(d.fileKey)} target="_blank" rel="noreferrer">{d.fileName}</a> · {formatBytes(d.size)} · updated{" "}
                  {d.updatedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                </div>
                <form action={replaceFile} className="inline-form">
                  <input type="hidden" name="id" value={d.id} />
                  <input type="file" name="file" required aria-label="New version" />
                  <button className="btn btn-quiet">Replace file</button>
                </form>
                <form action={deleteDocument} className="inline-form">
                  <input type="hidden" name="id" value={d.id} />
                  <button className="btn btn-danger">Delete</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="section-label">Add a document</h2>
      <form action={createDocument} className="admin-form">
        <label>Title<input type="text" name="title" required placeholder="e.g. Teaching Philosophy" /></label>
        <label>Description (optional)<input type="text" name="description" placeholder="One line shown under the title" /></label>
        <label>File<input type="file" name="file" required /></label>
        <button className="btn">Upload</button>
      </form>
    </section>
  );
}
