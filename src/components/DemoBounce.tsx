"use client";

import { useEffect } from "react";
import { useDemoMode } from "./DemoMode";

/**
 * Demo mode's DVD-screensaver layer for the recipe filters. Each filter/sort button gets a "back shape" (a
 * tilted, spinning rounded rectangle the size of the button) that starts behind it, then flies off and bounces
 * off the viewport walls until you leave the page. Every few seconds a faint "floater" joins, and everything
 * slowly speeds up, so the longer you stay the more the back layer drifts and piles up.
 *
 * Purely cosmetic: one fixed layer behind the content (z-index -1, pointer-events none, aria-hidden), moved
 * only with transform in a single requestAnimationFrame loop. Capped counts, paused when the tab is hidden,
 * off for prefers-reduced-motion. Bounce = classic reflect-the-velocity-at-the-wall (see docs/DECISIONS.md).
 */
const COLORS = [
  "#ffb02e",
  "#ff7a18",
  "#ff5e62",
  "#ff3d81",
  "#ffd54a",
  "#7af0ff",
];
const MAX_BUTTONS = 24;
const MAX_FLOATERS = 14;
const FLOATER_EVERY_MS = 6000;

type Shape = {
  el: HTMLSpanElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  r: number;
  vr: number;
};

export function DemoBounce({
  selector = ".wall-filters a, .wall-sort a",
}: {
  selector?: string;
}) {
  const { demo } = useDemoMode();
  useEffect(() => {
    if (!demo || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = document.createElement("div");
    layer.className = "wk-bounce";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
    const shapes: Shape[] = [];
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const add = (
      x: number,
      y: number,
      w: number,
      h: number,
      floater: boolean,
    ) => {
      const el = document.createElement("span");
      el.className = floater ? "wk-bounce-shape wk-floater" : "wk-bounce-shape";
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.style.color = COLORS[(Math.random() * COLORS.length) | 0];
      layer.appendChild(el);
      const speed = floater ? rnd(12, 30) : rnd(40, 90); // px per second
      const angle = rnd(0, Math.PI * 2);
      shapes.push({
        el,
        x,
        y,
        w,
        h,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: rnd(-8, 8),
        vr: rnd(-25, 25),
      });
    };
    for (const b of Array.from(
      document.querySelectorAll<HTMLElement>(selector),
    ).slice(0, MAX_BUTTONS)) {
      const box = b.getBoundingClientRect();
      if (box.width)
        add(box.left - 3, box.top - 3, box.width + 6, box.height + 6, false);
    }
    let raf = 0;
    let last = performance.now();
    const start = last;
    let nextFloater = start + FLOATER_EVERY_MS;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); // clamp after a hidden tab or a long frame
      last = now;
      const minutes = (now - start) / 60000;
      const boost = 1 + Math.min(1.5, minutes * 0.25); // chaos accumulates, gently, then levels off
      if (now > nextFloater && shapes.length < MAX_BUTTONS + MAX_FLOATERS) {
        nextFloater = now + FLOATER_EVERY_MS;
        const s = rnd(14, 46);
        add(
          rnd(0, innerWidth - s),
          rnd(0, innerHeight - s),
          s,
          s * rnd(0.6, 1.6),
          true,
        );
      }
      const W = innerWidth;
      const H = innerHeight;
      for (const s of shapes) {
        s.x += s.vx * dt * boost;
        s.y += s.vy * dt * boost;
        s.r += s.vr * dt;
        if (s.x <= 0) {
          s.x = 0;
          s.vx = Math.abs(s.vx);
        } else if (s.x + s.w >= W) {
          s.x = Math.max(0, W - s.w);
          s.vx = -Math.abs(s.vx);
        }
        if (s.y <= 0) {
          s.y = 0;
          s.vy = Math.abs(s.vy);
        } else if (s.y + s.h >= H) {
          s.y = Math.max(0, H - s.h);
          s.vy = -Math.abs(s.vy);
        }
        s.el.style.transform = `translate3d(${s.x}px,${s.y}px,0) rotate(${s.r}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    const visibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", visibility);
      layer.remove();
    };
  }, [demo, selector]);
  return null;
}
