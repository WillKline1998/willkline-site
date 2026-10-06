import { sections } from "@/lib/sections";

// Temporary page body used by every section until its milestone is built.
export function Placeholder({ href, children }: { href: string; children?: React.ReactNode }) {
  const s = sections.find((x) => x.href === href);
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">{s?.label}</h1>
      <p className="mt-3 text-lg opacity-80">{s?.blurb}</p>
      {children}
      <p className="mt-10 text-sm opacity-50">
        Scaffold — built out in milestone {s?.milestone} (see docs/PLAN.md).
      </p>
    </section>
  );
}
