"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Marks the section you're in (including its sub-pages) so the sidebar
// doubles as a "you are here" indicator.
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const current = href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
  return (
    <Link href={href} aria-current={current ? "page" : undefined}>
      {children}
    </Link>
  );
}
