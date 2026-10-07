"use client";

import { useState } from "react";

// Phones: a compact top bar with a Menu button that unfolds the nav.
// Tablet/desktop (>=768px): CSS always shows the sidebar and hides the button.
export function NavShell({ brand, children }: { brand: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <aside className="site-nav" data-open={open}>
      <div className="nav-bar">
        {brand}
        <button
          type="button"
          className="menu-button"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {/* Close after choosing a page (event delegation: any link inside). */}
      <div id="site-menu" className="nav-menu" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
        {children}
      </div>
    </aside>
  );
}
