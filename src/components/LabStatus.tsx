const LABELS: Record<string, string> = { IDEA: "Idea", BUILDING: "In progress", LIVE: "Live" };

export function LabStatus({ status }: { status: string }) {
  return <span className={`lab-status lab-status-${status.toLowerCase()}`}>{LABELS[status] ?? status}</span>;
}

export const techList = (tech: string) => tech.split(",").map((t) => t.trim()).filter(Boolean);
