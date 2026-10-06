import Link from "next/link";
import { sections } from "@/lib/sections";

export default function Home() {
  return (
    <section className="w-full max-w-4xl px-6 py-20 md:px-12">
      <p className="text-sm uppercase tracking-widest opacity-60">Bassist · Engineer · Tinkerer</p>
      <h1 className="mt-3 text-5xl font-bold tracking-tight sm:text-6xl">Will Kline</h1>
      <p className="mt-5 max-w-2xl text-lg opacity-80">
        One home for my music, work, writing, and experiments. Flip on demo mode to see
        what this site can really do.
      </p>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="card rounded-2xl border border-foreground/10 p-6 transition hover:border-foreground/40"
          >
            <h2 className="text-xl font-semibold">{s.label}</h2>
            <p className="mt-2 text-sm opacity-70">{s.blurb}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
