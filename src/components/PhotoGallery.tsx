"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GalleryPhoto = { id: string; url: string; title: string };

type View = { s: number; x: number; y: number };

/**
 * The Photos grid and its viewer. Thumbnails show the whole picture (no cropping). Click one and it opens as
 * large as fits the screen with a little breathing room (all four corners in frame). Arrows, the keyboard or a
 * swipe move between photos and wrap around. Zoom is the scroll wheel only (smooth, toward the pointer; no
 * click-to-zoom) or a pinch on touch screens; drag to pan when zoomed. Clicking anywhere off the picture, the
 * ✕, or Escape closes it, at any zoom level.
 */
export function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const n = photos.length;

  // The live view (scale + offset of the image's top-left corner inside the stage) and the wheel's target.
  const view = useRef<View>({ s: 1, x: 0, y: 0 });
  const target = useRef<View | null>(null);
  const fit = useRef(1);
  const raf = useRef(0);

  const show = useCallback((i: number) => setOpen(((i % n) + n) % n), [n]);
  const close = useCallback(() => {
    setOpen(null);
    opener.current?.focus();
  }, []);

  const paint = useCallback(() => {
    const el = img.current;
    const v = view.current;
    if (el) el.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.s})`;
    stage.current?.classList.toggle("zoomed", v.s > fit.current * 1.01);
  }, []);

  // Keep the picture from drifting off: when it is smaller than the stage it stays centred on that axis.
  const clamp = useCallback((v: View): View => {
    const st = stage.current;
    const el = img.current;
    if (!st || !el) return v;
    const s = Math.min(
      Math.max(v.s, fit.current),
      Math.max(fit.current * 12, 4),
    );
    const w = el.naturalWidth * s;
    const h = el.naturalHeight * s;
    const W = st.clientWidth;
    const H = st.clientHeight;
    const x = w <= W ? (W - w) / 2 : Math.min(0, Math.max(W - w, v.x));
    const y = h <= H ? (H - h) / 2 : Math.min(0, Math.max(H - h, v.y));
    return { s, x, y };
  }, []);

  // Fit the whole picture with breathing room for the close button, the arrows and the caption bar.
  const fitToScreen = useCallback(() => {
    const st = stage.current;
    const el = img.current;
    if (!st || !el || !el.naturalWidth) return;
    const W = st.clientWidth;
    const H = st.clientHeight;
    const side = W < 600 ? 12 : 72;
    const s = Math.min(
      (W - side * 2) / el.naturalWidth,
      (H - 64 - 56) / el.naturalHeight,
    );
    fit.current = s;
    target.current = null;
    view.current = {
      s,
      x: (W - el.naturalWidth * s) / 2,
      y: 64 + (H - 64 - 56 - el.naturalHeight * s) / 2,
    };
    paint();
  }, [paint]);

  // Zoom by `factor` keeping the point (cx, cy) in the stage pinned under the pointer.
  const zoomAround = (
    v: View,
    factor: number,
    cx: number,
    cy: number,
  ): View => {
    const s = Math.min(
      Math.max(v.s * factor, fit.current),
      Math.max(fit.current * 12, 4),
    );
    const k = s / v.s;
    return { s, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
  };

  // A cached image can finish loading before React attaches onLoad, so also fit it as soon as it is mounted.
  const ready = useCallback(() => {
    const el = img.current;
    if (!el || !el.complete || !el.naturalWidth) return;
    fitToScreen();
    el.style.visibility = "visible";
  }, [fitToScreen]);
  useEffect(() => {
    if (open !== null) ready();
  }, [open, ready]);

  useEffect(() => {
    if (open === null) return;
    closeBtn.current?.focus();
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") show(open + 1);
      else if (e.key === "ArrowLeft") show(open - 1);
    };
    const st = stage.current!;
    const animate = () => {
      const t = target.current;
      if (!t) return;
      const v = view.current;
      const next = {
        s: v.s + (t.s - v.s) * 0.28,
        x: v.x + (t.x - v.x) * 0.28,
        y: v.y + (t.y - v.y) * 0.28,
      };
      const done = Math.abs(t.s - next.s) < t.s * 0.001;
      view.current = done ? t : next;
      if (done) target.current = null;
      paint();
      if (!done) raf.current = requestAnimationFrame(animate);
    };
    // Scroll wheel (no modifier needed) = smooth zoom toward the pointer. Native listener: it must not be passive.
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = st.getBoundingClientRect();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const from = target.current ?? view.current;
      target.current = clamp(
        zoomAround(
          from,
          Math.exp(-dy * 0.002),
          e.clientX - r.left,
          e.clientY - r.top,
        ),
      );
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(animate);
    };
    const resize = () => fitToScreen();
    window.addEventListener("keydown", key);
    window.addEventListener("resize", resize);
    st.addEventListener("wheel", wheel, { passive: false });
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", key);
      window.removeEventListener("resize", resize);
      st.removeEventListener("wheel", wheel);
      cancelAnimationFrame(raf.current);
    };
  }, [open, show, close, clamp, paint, fitToScreen]);

  // Pointers: one = drag to pan (or swipe between photos when not zoomed), two = pinch zoom. A tap that
  // doesn't move and isn't on the picture closes the viewer.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    x: number;
    y: number;
    moved: boolean;
    pinch: number | null;
    onImg: boolean;
  }>({ x: 0, y: 0, moved: false, pinch: null, onImg: false });
  const dist = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture?.(e.pointerId);
    target.current = null;
    if (pointers.current.size === 1)
      gesture.current = {
        x: e.clientX,
        y: e.clientY,
        moved: false,
        pinch: null,
        onImg: e.target === img.current,
      };
    else if (pointers.current.size === 2) {
      gesture.current.pinch = dist();
      gesture.current.moved = true;
    }
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    const g = gesture.current;
    if (Math.abs(cur.x - g.x) + Math.abs(cur.y - g.y) > 6) g.moved = true;
    const r = stage.current!.getBoundingClientRect();
    if (pointers.current.size >= 2 && g.pinch) {
      const d = dist();
      const [a, b] = [...pointers.current.values()];
      view.current = clamp(
        zoomAround(
          view.current,
          d / g.pinch,
          (a.x + b.x) / 2 - r.left,
          (a.y + b.y) / 2 - r.top,
        ),
      );
      g.pinch = d;
      paint();
    } else if (view.current.s > fit.current * 1.01) {
      view.current = clamp({
        ...view.current,
        x: view.current.x + cur.x - prev.x,
        y: view.current.y + cur.y - prev.y,
      });
      paint();
    }
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size > 0) return;
    const dx = e.clientX - g.x;
    const zoomed = view.current.s > fit.current * 1.01;
    if (!g.moved && !g.onImg) close();
    else if (
      !zoomed &&
      g.pinch === null &&
      e.pointerType !== "mouse" &&
      Math.abs(dx) > 50
    )
      show(open! + (dx < 0 ? 1 : -1));
  };

  const p = open === null ? null : photos[open];
  return (
    <>
      <ul className="photo-grid">
        {photos.map((ph, i) => (
          <li key={ph.id}>
            <button
              type="button"
              className="photo-thumb"
              aria-label={`Open ${ph.title || "photo"} (${i + 1} of ${n})`}
              onClick={(e) => {
                opener.current = e.currentTarget;
                show(i);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph.url} alt={ph.title || "Photo"} loading="lazy" />
            </button>
            {ph.title && <p className="media-title">{ph.title}</p>}
          </li>
        ))}
      </ul>

      {p && (
        <div
          className="viewer"
          role="dialog"
          aria-modal="true"
          aria-label={`${p.title || "Photo"}, ${open! + 1} of ${n}`}
        >
          <div className="viewer-backdrop" />
          <div
            ref={stage}
            className="viewer-stage"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={p.id}
              ref={img}
              src={p.url}
              alt={p.title || "Photo"}
              draggable={false}
              style={{ visibility: "hidden" }}
              onLoad={ready}
            />
          </div>
          <div className="viewer-bar">
            <span className="viewer-count" aria-hidden>
              {open! + 1} / {n}
            </span>
            {p.title && <span className="viewer-title">{p.title}</span>}
            <span className="viewer-hint">
              Scroll to zoom · drag to look around
            </span>
          </div>
          <button
            ref={closeBtn}
            type="button"
            className="viewer-btn viewer-close"
            onClick={close}
            aria-label="Close"
          >
            ✕
          </button>
          {n > 1 && (
            <>
              <button
                type="button"
                className="viewer-btn viewer-prev"
                onClick={() => show(open! - 1)}
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                className="viewer-btn viewer-next"
                onClick={() => show(open! + 1)}
                aria-label="Next photo"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
