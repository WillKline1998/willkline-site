import type { Document } from "@/generated/prisma/client";
import { fileUrl, formatBytes } from "@/lib/storage";

// Downloadable documents (résumé, CV, …), whatever Will has uploaded.
export function DocumentList({ docs }: { docs: Document[] }) {
  if (!docs.length) return null;
  return (
    <ul className="doc-list">
      {docs.map((d) => (
        <li key={d.id}>
          <a className="file-card" href={fileUrl(d.fileKey)} target="_blank" rel="noreferrer" download={d.fileName}>
            <span className="file-icon" aria-hidden>{d.fileName.split(".").pop()?.toUpperCase().slice(0, 4) || "FILE"}</span>
            <span className="doc-text">
              <span className="doc-title">{d.title}</span>
              {d.description && <span className="doc-desc">{d.description}</span>}
            </span>
            <span className="file-action">
              {formatBytes(d.size)} · updated {d.updatedAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
