"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TECH } from "./LabTechs";

/**
 * A Lab tech chip with a Wikipedia-style preview card: logo, name and a short blurb. Opens on hover, keyboard
 * focus or tap; closes on mouse-leave (after a short grace period so you can move onto the card), outside
 * click/tap or Escape. The card is portalled to <body> and absolutely positioned in page coordinates, so it
 * never changes the page's layout or moves the other chips.
 */
export function TechChip({ label }: { label: string }) {
  const info = TECH[label];
  const [open, setOpen] = useState(false);
  const chip = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const id = useId();
  const lastPointer = useRef("mouse");

  const show = useCallback(() => {
    clearTimeout(timer.current);
    setOpen(true);
  }, []);
  const hideSoon = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 180);
  }, []);

  // Place the card under the chip (above it if there's no room), clamped to the viewport width.
  const place = useCallback(() => {
    const c = chip.current;
    const k = card.current;
    if (!c || !k) return;
    const r = c.getBoundingClientRect();
    const w = k.offsetWidth;
    const h = k.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const left = Math.min(
      Math.max(8, r.left + r.width / 2 - w / 2),
      vw - w - 8,
    );
    const below = r.bottom + 8;
    const top =
      below + h > window.innerHeight - 8 && r.top - h - 8 > 0
        ? r.top - h - 8
        : below;
    k.style.top = `${top + window.scrollY}px`;
    k.style.left = `${left + window.scrollX}px`;
    k.style.visibility = "visible";
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!chip.current?.contains(t) && !card.current?.contains(t))
        setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        chip.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!info) return <span>{label}</span>;
  // Hover only for real mice; touch gets tap-to-toggle (a touch "hover" would fight the tap).
  const mouse = (e: React.PointerEvent) => e.pointerType === "mouse";
  return (
    <>
      <button
        ref={chip}
        type="button"
        className="tech-chip"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onPointerDown={(e) => (lastPointer.current = e.pointerType)}
        onPointerEnter={(e) => mouse(e) && show()}
        onPointerLeave={(e) => mouse(e) && hideSoon()}
        // Keyboard focus opens it; a tap's focus is left to onClick so the tap doesn't open-then-close.
        onFocus={(e) => e.currentTarget.matches(":focus-visible") && show()}
        onBlur={hideSoon}
        onClick={() => {
          clearTimeout(timer.current);
          // Mouse: hover already opened it, so a click keeps it open. Touch/pen: tap toggles.
          setOpen((o) => (lastPointer.current === "mouse" ? true : !o));
        }}
      >
        {label}
      </button>
      {open &&
        createPortal(
          <div
            ref={card}
            id={id}
            role="tooltip"
            className={info.logo ? "tech-card" : "tech-card no-logo"}
            style={{ top: 0, left: 0, visibility: "hidden" }}
            onPointerEnter={(e) => mouse(e) && show()}
            onPointerLeave={(e) => mouse(e) && hideSoon()}
          >
            {info.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="tech-card-logo"
                src={info.logo}
                alt=""
                width={40}
                height={40}
              />
            )}
            <span className="tech-card-name">{label}</span>
            <p className="tech-card-blurb">{info.blurb}</p>
          </div>,
          document.body,
        )}
    </>
  );
}
