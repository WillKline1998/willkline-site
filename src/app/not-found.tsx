import Link from "next/link";
import { sections } from "@/lib/sections";

// Friendly 404 inside the normal site layout, pointing back to real pages.
export default function NotFound() {
  return (
    <section className="page">
      <p className="section-label">404</p>
      <h1 className="page-title">Wrong note.</h1>
      <p className="lede">That page doesn&apos;t exist, or it moved. Try one of these:</p>
      <ul className="not-found-links">
        <li><Link href="/">Home</Link></li>
        {sections.map((s) => <li key={s.href}><Link href={s.href}>{s.label}</Link></li>)}
      </ul>
    </section>
  );
}
