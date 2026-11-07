"use client";

import { useEffect } from "react";
import { useDemoMode } from "./DemoMode";

const COLORS = [
  "#ffd54a",
  "#ff9a3c",
  "#ff5e62",
  "#ff3d81",
  "#fff4e8",
  "#7af0ff",
];

/**
 * Demo mode's sparkle trail. The system cursor is never hidden; this only adds sparkles behind it in one
 * fixed, click-through layer (pointer-events: none), so clicking always works. Mouse/pen only (no trail on
 * touch), capped in number, and off for prefers-reduced-motion.
 */
export function DemoCursor() {
  const { demo } = useDemoMode();
  useEffect(() => {
    if (!demo || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = document.createElement("div");
    layer.className = "wk-sparkles";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
    let last = 0;
    let lx = 0;
    let ly = 0;
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const now = performance.now();
      if (now - last < 16 || Math.hypot(e.clientX - lx, e.clientY - ly) < 6)
        return;
      last = now;
      lx = e.clientX;
      ly = e.clientY;
      if (layer.childElementCount > 60) layer.firstElementChild?.remove();
      const s = document.createElement("span");
      s.className = "wk-sparkle";
      const size = 8 + Math.random() * 12;
      s.style.cssText = `--x:${e.clientX + 10}px;--y:${e.clientY + 14}px;--dx:${(Math.random() - 0.5) * 40}px;--dy:${10 + Math.random() * 30}px;width:${size}px;height:${size}px;color:${COLORS[(Math.random() * COLORS.length) | 0]}`;
      s.addEventListener("animationend", () => s.remove());
      layer.appendChild(s);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      layer.remove();
    };
  }, [demo]);
  return null;
}
