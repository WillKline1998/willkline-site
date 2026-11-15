"use client";

import { useEffect, useSyncExternalStore } from "react";
import { artistClusters, clusterRadius, type ArtistCluster } from "@/lib/songbook";
import { useDemoMode } from "./DemoMode";

/**
 * Demo mode on /songbook: one circle per artist, sized by how many songs they have, drifting DVD-screensaver style.
 * Circles bounce off the walls (like DemoBounce) AND off each other: an elastic hit between two discs, mass by
 * area, so a big artist shoves a small one aside. Radius grows with sqrt(count) (area ∝ songs) and is clamped
 * between a minimum (a one-song artist stays readable) and a maximum (a 20-song artist can't eat the screen).
 *
 * Same safety recipe as DemoBounce: one fixed layer behind the content (z-index -1, pointer-events none,
 * aria-hidden), transforms only, one requestAnimationFrame loop, ≤20 circles (≤12 on phones; the rest fold into
 * "+N more"), paused while the tab is hidden. Under prefers-reduced-motion nothing moves: a static legend instead.
 */
const COLORS = ["#ffb02e", "#ff7a18", "#ff5e62", "#ff3d81", "#ffd54a", "#7af0ff", "#9b8cff", "#5fe3a1"];

type Disc = { el: HTMLDivElement; x: number; y: number; vx: number; vy: number; r: number; m: number };

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const m = matchMedia(reducedQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

export function ArtistBubbles({ artists }: { artists: string[] }) {
  const { demo } = useDemoMode();
  const reduced = useSyncExternalStore(subscribeReduced, () => matchMedia(reducedQuery).matches, () => false);
  const key = artists.join("\u0001");

  useEffect(() => {
    if (!demo || reduced || artists.length === 0) return;
    const phone = innerWidth < 560;
    const clusters = artistClusters(artists, phone ? 12 : 20);
    const maxCount = Math.max(...clusters.map((c) => c.count));
    let [minR, maxR] = phone ? [30, 72] : [40, 120];
    // Never fill more than ~40% of the screen, whatever the catalogue looks like.
    const area = clusters.reduce((a, c) => a + Math.PI * clusterRadius(c.count, maxCount, minR, maxR) ** 2, 0);
    const room = innerWidth * innerHeight * 0.4;
    if (area > room) {
      const k = Math.sqrt(room / area);
      minR = Math.max(phone ? 24 : 30, minR * k);
      maxR = Math.max(minR, maxR * k);
    }

    const layer = document.createElement("div");
    layer.className = "wk-bounce wk-artist-bubbles";
    layer.setAttribute("aria-hidden", "true");
    layer.dataset.hits = "0";
    document.body.appendChild(layer);

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const discs: Disc[] = [];
    clusters.forEach((c: ArtistCluster, i) => {
      const r = clusterRadius(c.count, maxCount, minR, maxR);
      const el = document.createElement("div");
      el.className = "wk-artist-bubble" + (c.none ? " wk-artist-none" : "") + (c.rest ? " wk-artist-rest" : "");
      el.style.width = el.style.height = `${r * 2}px`;
      el.style.color = c.none ? "#c9c9d6" : COLORS[i % COLORS.length];
      el.dataset.count = String(c.count);
      el.style.fontSize = `${Math.max(11, Math.min(17, r / 4.2))}px`;
      const name = document.createElement("span");
      name.className = "wk-artist-name";
      name.textContent = c.name;
      const count = document.createElement("span");
      count.className = "wk-artist-count";
      count.textContent = c.rest ? `${c.count} songs` : `${c.count} ${c.count === 1 ? "song" : "songs"}`;
      el.append(name, count);
      layer.appendChild(el);
      // Drop it somewhere free (a few tries), so circles don't start stacked.
      let x = 0;
      let y = 0;
      for (let t = 0; t < 40; t++) {
        x = rnd(r, Math.max(r + 1, innerWidth - r));
        y = rnd(r, Math.max(r + 1, innerHeight - r));
        if (discs.every((d) => Math.hypot(d.x - x, d.y - y) > d.r + r + 4)) break;
      }
      const speed = rnd(28, 60) * (phone ? 0.8 : 1); // px per second; calm
      const a = rnd(0, Math.PI * 2);
      discs.push({ el, x, y, r, m: r * r, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed });
    });

    let hits = 0;
    let frame = 0;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); // clamp after a hidden tab or a long frame
      last = now;
      const W = innerWidth;
      const H = innerHeight;
      for (const d of discs) {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.x - d.r <= 0) {
          d.x = d.r;
          d.vx = Math.abs(d.vx);
        } else if (d.x + d.r >= W) {
          d.x = Math.max(d.r, W - d.r);
          d.vx = -Math.abs(d.vx);
        }
        if (d.y - d.r <= 0) {
          d.y = d.r;
          d.vy = Math.abs(d.vy);
        } else if (d.y + d.r >= H) {
          d.y = Math.max(d.r, H - d.r);
          d.vy = -Math.abs(d.vy);
        }
      }
      // Disc-disc: separate the overlap (by mass) and swap momentum along the line between centres.
      for (let i = 0; i < discs.length; i++) {
        for (let j = i + 1; j < discs.length; j++) {
          const a = discs[i];
          const b = discs[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.01;
          const overlap = a.r + b.r - dist;
          if (overlap <= 0) continue;
          const nx = dx / dist;
          const ny = dy / dist;
          const total = a.m + b.m;
          a.x -= nx * overlap * (b.m / total);
          a.y -= ny * overlap * (b.m / total);
          b.x += nx * overlap * (a.m / total);
          b.y += ny * overlap * (a.m / total);
          const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (rel <= 0) continue; // already moving apart
          const p = (2 * rel) / total;
          a.vx -= p * b.m * nx;
          a.vy -= p * b.m * ny;
          b.vx += p * a.m * nx;
          b.vy += p * a.m * ny;
          hits++;
        }
      }
      for (const d of discs) {
        // Keep everyone drifting: no circle stalls or rockets after a pile-up.
        const s = Math.hypot(d.vx, d.vy) || 1;
        const target = Math.min(90, Math.max(20, s));
        d.vx *= target / s;
        d.vy *= target / s;
        d.el.style.transform = `translate3d(${d.x - d.r}px,${d.y - d.r}px,0)`;
      }
      if (++frame % 30 === 0) layer.dataset.hits = String(hits);
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
    // `key` stands in for the artists array (a new array each render, same contents).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, reduced, key]);

  if (!demo || !reduced || artists.length === 0) return null;
  // Reduced motion: the same groups, standing still, as a small legend.
  return (
    <ul className="artist-legend" aria-label="Artists in the Songbook">
      {artistClusters(artists, 20).map((c) => (
        <li key={c.name} className={c.none ? "artist-legend-none" : undefined}>
          {c.name} <span className="muted">{c.count}</span>
        </li>
      ))}
    </ul>
  );
}
