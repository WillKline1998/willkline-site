import Link from "next/link";
import { sections } from "@/lib/sections";
import { DemoToggle } from "@/components/DemoMode";

export function Nav() {
  return (
    <header className="site-nav border-b border-foreground/10">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-6 py-4">
        <Link href="/" className="mr-auto text-lg font-semibold tracking-tight">
          Will Kline
        </Link>
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="text-sm opacity-80 hover:opacity-100">
            {s.label}
          </Link>
        ))}
        <DemoToggle />
      </nav>
    </header>
  );
}
