import Link from "next/link";
import { sections } from "@/lib/sections";
import { DemoToggle } from "@/components/DemoMode";
import { NavShell } from "@/components/NavShell";
import { AccountLinks } from "@/components/AccountLinks";

export function Nav() {
  return (
    <NavShell
      brand={
        <Link href="/" className="site-name">
          Will Kline
          <span className="site-tagline">
            <span>Bassist</span> <span>Composer</span> <span>Engineer</span>
          </span>
        </Link>
      }
    >
      <nav aria-label="Site">
        <ul>
          <li><Link href="/">Home</Link></li>
          {sections.map((s) => (
            <li key={s.href}><Link href={s.href}>{s.label}</Link></li>
          ))}
        </ul>
      </nav>
      <div className="nav-foot">
        <DemoToggle />
        <AccountLinks />
      </div>
    </NavShell>
  );
}
