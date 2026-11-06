"use client";

import { useState, useRef, useEffect } from "react";
import { TECH, TechKey } from "./LabTechs";

/**
 * A chip that opens a small popover with a one-line explanation when you hover or focus it.
 * Clicking outside (or pressing Escape) closes it again. The popover positions itself below the
 * chip and keeps within the viewport. Fade and slide in, and set aside when it is closed.
 */
export function TechChip({ label }: { label: TechKey }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !open) return;
    const rect = el.getBoundingClientRect();
    const pop = ref.current!.nextSibling as HTMLElement | null;
    if (!pop) return;
    const pr = pop.getBoundingClientRect();
    const doc = document.documentElement;
    setPos({
      top: Math.max(6, rect.bottom - (document.body.scrollTop ?? 0) + 6),
      left: Math.min(rect.left + rect.width / 2 - pr.width / 2, doc.clientWidth - pr.width - 12),
    });
  }, [open]);

  return (
    <span
      ref={ref}
      className="tech-chip"
      onMouseEnter={() => setOpen(true)}
      onFocus={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={() => setOpen(false)}
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${TECH[label]}`}
    >
      {label}
      {open && (
        <span
          className="tech-pop"
          style={{ top: pos.top, left: pos.left }}
          role="tooltip"
          aria-live="polite"
        >
          {TECH[label]}
        </span>
      )}
    </span>
  );
}
