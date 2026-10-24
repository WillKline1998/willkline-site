"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GalleryPhoto = { id: string; url: string; title: string };

/**
 * The Photos grid and its viewer. Thumbnails show the whole picture (no cropping). Click one and it opens
 * full screen: arrows (or the keyboard, or a swipe) move between photos and wrap around at the ends; click
 * the picture to zoom in and out, and drag or scroll to look around when zoomed.
 */
export function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const n = photos.length;

  const show = useCallback((i: number) => {
    setZoomed(false);
    setOpen(((i % n) + n) % n);
  }, [n]);
  const close = useCallback(() => {
    setOpen(null);
    setZoomed(false);
    opener.current?.focus();
  }, []);

  useEffect(() => {
    if (open === null) return;
    closeBtn.current?.focus();
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") show(open + 1);
      else if (e.key === "ArrowLeft") show(open - 1);
    };
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", key);
    };
  }, [open, show, close]);

  // Zoom toward the spot that was clicked, and let the person drag the picture around.
  const toggleZoom = (e: React.MouseEvent<HTMLImageElement>) => {
    const box = stage.current;
    const img = e.currentTarget;
    if (!box) return;
    if (zoomed) return setZoomed(false);
    const rect = img.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    setZoomed(true);
    requestAnimationFrame(() => {
      box.scrollLeft = fx * box.scrollWidth - box.clientWidth / 2;
      box.scrollTop = fy * box.scrollHeight - box.clientHeight / 2;
    });
  };
  const drag = useRef<{ x: number; y: number; l: number; t: number; moved: boolean } | null>(null);

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
        <div className="viewer" role="dialog" aria-modal="true" aria-label={`${p.title || "Photo"}, ${open! + 1} of ${n}`}>
          <div className="viewer-backdrop" onClick={close} />
          <div
            ref={stage}
            className={zoomed ? "viewer-stage zoomed" : "viewer-stage"}
            onTouchStart={(e) => (touchX.current = zoomed ? null : e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              touchX.current = null;
              if (Math.abs(dx) > 50) show(open! + (dx < 0 ? 1 : -1));
            }}
            onPointerDown={(e) => {
              const box = stage.current;
              if (!zoomed || !box || e.pointerType === "touch") return;
              drag.current = { x: e.clientX, y: e.clientY, l: box.scrollLeft, t: box.scrollTop, moved: false };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              const box = stage.current;
              if (!d || !box) return;
              if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4) d.moved = true;
              box.scrollLeft = d.l - (e.clientX - d.x);
              box.scrollTop = d.t - (e.clientY - d.y);
            }}
            onPointerUp={() => setTimeout(() => (drag.current = null), 0)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={p.title || "Photo"}
              className={zoomed ? "zoomed" : undefined}
              draggable={false}
              onClick={(e) => (drag.current?.moved ? undefined : toggleZoom(e))}
            />
          </div>
          <div className="viewer-bar">
            <span className="viewer-count" aria-hidden>{open! + 1} / {n}</span>
            {p.title && <span className="viewer-title">{p.title}</span>}
            <span className="viewer-hint">{zoomed ? "Click to zoom out" : "Click the photo to zoom"}</span>
          </div>
          <button ref={closeBtn} type="button" className="viewer-btn viewer-close" onClick={close} aria-label="Close">✕</button>
          {n > 1 && (
            <>
              <button type="button" className="viewer-btn viewer-prev" onClick={() => show(open! - 1)} aria-label="Previous photo">‹</button>
              <button type="button" className="viewer-btn viewer-next" onClick={() => show(open! + 1)} aria-label="Next photo">›</button>
            </>
          )}
        </div>
      )}
    </>
  );
}
