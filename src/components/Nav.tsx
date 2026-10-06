import Link from "next/link";
import { sections } from "@/lib/sections";
import { DemoToggle } from "@/components/DemoMode";

export function Nav() {
  return (
    <aside className="site-nav border-b border-foreground/10 md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r">
      <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-4 md:h-full md:flex-col md:flex-nowrap md:items-start md:gap-3 md:py-10">
        <Link href="/" className="mr-auto text-lg font-semibold tracking-tight md:mb-6 md:mr-0 md:text-xl">
          Will Kline
        </Link>
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="text-sm opacity-80 hover:opacity-100 md:text-base">
            {s.label}
          </Link>
        ))}
        <div className="md:mt-auto">
          <DemoToggle />
        </div>
      </nav>
    </aside>
  );
}
