export const LAB_STATUSES = ["IDEA", "BUILDING", "LIVE"] as const;
const LABELS: Record<string, string> = { IDEA: "Idea", BUILDING: "In progress", LIVE: "Live" };

// `status` is a comma-separated list (like `tech`), so a project can be both "In progress" and "Live".
export const statusList = (status: string) => status.split(",").map((s) => s.trim()).filter(Boolean);

export function LabStatus({ status }: { status: string }) {
  return (
    <span className="lab-statuses">
      {statusList(status).map((s) => (
        <span key={s} className={`lab-status lab-status-${s.toLowerCase()}`}>{LABELS[s] ?? s}</span>
      ))}
    </span>
  );
}

export const techList = (tech: string) => tech.split(",").map((t) => t.trim()).filter(Boolean);
