import Link from "next/link";
import { sections } from "@/lib/sections";
import { DemoToggle } from "@/components/DemoMode";

export function Nav() {
  return (
    <aside className="site-nav">
      <Link href="/" className="site-name">
        Will Kline
        <span className="site-tagline">
          <span>Bassist</span> <span>Composer</span> <span>Engineer</span>
        </span>
      </Link>
      <nav>
        <ul>
          <li><Link href="/">Home</Link></li>
          {sections.map((s) => (
            <li key={s.href}><Link href={s.href}>{s.label}</Link></li>
          ))}
        </ul>
      </nav>
      <div className="nav-foot"><DemoToggle /></div>
    </aside>
  );
}
