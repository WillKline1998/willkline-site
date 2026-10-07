import { sections } from "@/lib/sections";

// Temporary page body used by every section until its milestone is built.
export function Placeholder({ href, children }: { href: string; children?: React.ReactNode }) {
  const s = sections.find((x) => x.href === href);
  return (
    <section className="page">
      <h1 className="page-title">{s?.label}</h1>
      <p className="lede">{s?.blurb}</p>
      {children}
      <p className="muted small">Coming soon.</p>
    </section>
  );
}
