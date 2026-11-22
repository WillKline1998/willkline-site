"use client";

import { useEffect, useSyncExternalStore } from "react";
import { artistClusters, bubbleCap, clusterRadius, type ArtistCluster } from "@/lib/songbook";
import { useDemoMode } from "./Theme";

/**
 * Demo mode on /songbook: one circle per artist, sized by how many songs they have, drifting DVD-screensaver style.
 * Circles bounce off the walls (like DemoBounce) AND off each other: an elastic hit between two discs, mass by
 * area, so a big artist shoves a small one aside. Radius grows with sqrt(count) (area ∝ songs) and is clamped
 * between a minimum (a one-song artist stays readable) and a maximum (a 20-song artist can't eat the screen).
 *
 * Same safety recipe as DemoBounce: one fixed layer behind the content (z-index -1, pointer-events none,
 * aria-hidden), transforms only, one requestAnimationFrame loop, paused while the tab is hidden. Cap: bubbleCap()
 * (20 desktop / 12 phone, stretched to 24 / 14 when the catalogue only just overflows); past it the smallest
 * artists fold into "+N more".
 *
 * The one exception to click-through: the "+N more" bubble. Hovering it (or tapping it on open background, or
 * tabbing to it) opens a small popover listing the folded artists ("Temples · 1"); outside click / Escape closes.
 * The layer sits behind the content, so the hit test is done by geometry on document pointer events, and it
 * never fires when the pointer is over a link/button/input — those keep working exactly as before. Under prefers-reduced-motion nothing moves: a static legend instead.
 *
 * `folders` (optional): sub-folders of the folder being viewed, one extra circle each, sized by song count on the
 * same clamped scale as the artists. They take slots from the cap, so the total never grows.
 */
const COLORS = ["#ffb02e", "#ff7a18", "#ff5e62", "#ff3d81", "#ffd54a", "#7af0ff", "#9b8cff", "#5fe3a1"];

type Disc = { el: HTMLDivElement; x: number; y: number; vx: number; vy: number; r: number; m: number };

const reducedQuery = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const m = matchMedia(reducedQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

type FolderBubble = { name: string; count: number };

function allClusters(artists: string[], folders: FolderBubble[], phone: boolean): ArtistCluster[] {
  const cap = bubbleCap(artistClusters(artists, Infinity).length + folders.length, phone);
  const own = folders.slice(0, Math.max(0, cap - 2)).map((f) => ({ ...f, folder: true }));
  return [...artistClusters(artists, cap - own.length), ...own];
}

export function ArtistBubbles({ artists, folders = [] }: { artists: string[]; folders?: FolderBubble[] }) {
  const { demo } = useDemoMode();
  const reduced = useSyncExternalStore(subscribeReduced, () => matchMedia(reducedQuery).matches, () => false);
  const key = artists.join("\u0001") + "\u0002" + folders.map((f) => `${f.name}\u0003${f.count}`).join("\u0001");

  useEffect(() => {
    if (!demo || reduced || artists.length + folders.length === 0) return;
    const phone = innerWidth < 560;
    const clusters = allClusters(artists, folders, phone);
    const maxCount = Math.max(...clusters.map((c) => c.count));
    let [minR, maxR] = phone ? [28, 72] : [36, 120];
    // Never fill more than ~40% of the screen, whatever the catalogue looks like.
    const area = clusters.reduce((a, c) => a + Math.PI * clusterRadius(c.count, maxCount, minR, maxR) ** 2, 0);
    const room = innerWidth * innerHeight * 0.4;
    if (area > room) {
      const k = Math.sqrt(room / area);
      minR = Math.max(phone ? 22 : 28, minR * k);
      maxR = Math.max(minR, maxR * k);
    }

    const layer = document.createElement("div");
    layer.className = "wk-bounce wk-artist-bubbles";
    layer.dataset.hits = "0";
    const restRef: { v: { el: HTMLDivElement; c: ArtistCluster; d: Disc } | null } = { v: null };
    document.body.appendChild(layer);

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const discs: Disc[] = [];
    clusters.forEach((c: ArtistCluster, i) => {
      const r = clusterRadius(c.count, maxCount, minR, maxR);
      const el = document.createElement("div");
      el.className = "wk-artist-bubble" + (c.none ? " wk-artist-none" : "") + (c.rest ? " wk-artist-rest" : "") + (c.folder ? " wk-folder-bubble" : "");
      el.style.width = el.style.height = `${r * 2}px`;
      el.style.color = c.none ? "#c9c9d6" : COLORS[i % COLORS.length];
      el.dataset.count = String(c.count);
      el.style.fontSize = `${Math.max(11, Math.min(17, r / 4.2))}px`;
      const name = document.createElement("span");
      name.className = "wk-artist-name";
      name.textContent = c.name;
      const count = document.createElement("span");
      count.className = "wk-artist-count";
      count.textContent = c.folder ? `📁 ${c.count} ${c.count === 1 ? "song" : "songs"}` : c.rest ? `${c.count} songs` : `${c.count} ${c.count === 1 ? "song" : "songs"}`;
      el.append(name, count);
      if (c.rest) {
        el.tabIndex = 0;
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", `${c.name} artists: show the list`);
        el.setAttribute("aria-expanded", "false");
        el.removeAttribute("aria-hidden");
        restRef.v = { el, c, d: null as unknown as Disc };
      } else el.setAttribute("aria-hidden", "true");
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
      el.style.transform = `translate3d(${x - r}px,${y - r}px,0)`; // placed before the first frame, so hit tests match
      discs.push({ el, x, y, r, m: r * r, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed });
      if (restRef.v && restRef.v.el === el) restRef.v.d = discs[discs.length - 1];
    });
    const rest = restRef.v;
    const popover = rest ? restPopover(rest.el, rest.c) : null;
    const offPopover = popover && rest ? wirePopover(rest.el, rest.d, popover) : () => {};

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
      popover?.follow();
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
      offPopover();
      popover?.el.remove();
      layer.remove();
    };
    // `key` stands in for the artists array (a new array each render, same contents).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, reduced, key]);

  if (!demo || !reduced || artists.length + folders.length === 0) return null;
  // Reduced motion: the same groups, standing still, as a small legend.
  return (
    <ul className="artist-legend" aria-label="Artists in the Songbook">
      {allClusters(artists, folders, false).map((c) => (
        <li key={(c.folder ? "f:" : "a:") + c.name} className={c.none ? "artist-legend-none" : c.folder ? "artist-legend-folder" : undefined}>
          {c.name} <span className="muted">{c.count}</span>
        </li>
      ))}
    </ul>
  );
}

const INTERACTIVE = "a, button, input, select, textarea, label, summary, [role=button]:not(.wk-artist-rest), [contenteditable]";

/** The "+N more" list: portalled to <body>, above everything, follows the drifting bubble while open. */
function restPopover(bubble: HTMLDivElement, c: ArtistCluster) {
  const el = document.createElement("div");
  el.className = "wk-rest-pop";
  el.id = "wk-rest-pop";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", "More artists");
  el.hidden = true;
  const ul = document.createElement("ul");
  for (const m of c.members ?? []) {
    const li = document.createElement("li");
    li.textContent = `${m.name} · ${m.count}`;
    ul.appendChild(li);
  }
  el.appendChild(ul);
  document.body.appendChild(el);
  bubble.setAttribute("aria-controls", el.id);
  const follow = () => {
    if (el.hidden) return;
    const r = bubble.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), document.documentElement.clientWidth - w - 8);
    const top = r.bottom + 8 + h > innerHeight - 8 && r.top - h - 8 > 0 ? r.top - h - 8 : Math.min(r.bottom + 8, innerHeight - h - 8);
    el.style.transform = `translate3d(${Math.round(left)}px,${Math.round(Math.max(8, top))}px,0)`;
  };
  return { el, follow };
}

/** Hover / tap / focus / Escape wiring. Geometry hit test because the bubble layer sits behind the page. */
function wirePopover(bubble: HTMLDivElement, d: Disc, pop: { el: HTMLDivElement; follow: () => void }) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pinned = false; // opened by tap/click/focus: stays until outside click or Escape
  const set = (open: boolean) => {
    clearTimeout(timer);
    if (!pop.el.hidden === open) return;
    pop.el.hidden = !open;
    bubble.setAttribute("aria-expanded", String(open));
    bubble.classList.toggle("wk-rest-open", open);
    if (open) pop.follow();
    else pinned = false;
  };
  const over = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > d.r) return false;
    const t = e.target as Element | null;
    return !t?.closest?.(INTERACTIVE) || t === bubble;
  };
  const move = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (over(e) || pop.el.contains(e.target as Node)) set(true);
    else if (!pinned && !pop.el.hidden) {
      clearTimeout(timer);
      timer = setTimeout(() => set(false), 180);
    }
  };
  const down = (e: PointerEvent) => {
    if (pop.el.contains(e.target as Node)) return;
    if (over(e)) {
      pinned = true;
      set(true);
    } else set(false);
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !pop.el.hidden) {
      set(false);
      if (document.activeElement === bubble) bubble.blur();
    } else if ((e.key === "Enter" || e.key === " ") && document.activeElement === bubble) {
      e.preventDefault();
      const open = pop.el.hidden === true;
      set(open);
      pinned = open;
    }
  };
  const focus = () => {
    pinned = true;
    set(true);
  };
  const blur = () => set(false);
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerdown", down);
  document.addEventListener("keydown", key);
  bubble.addEventListener("focus", focus);
  bubble.addEventListener("blur", blur);
  return () => {
    clearTimeout(timer);
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerdown", down);
    document.removeEventListener("keydown", key);
    bubble.removeEventListener("focus", focus);
    bubble.removeEventListener("blur", blur);
  };
}
