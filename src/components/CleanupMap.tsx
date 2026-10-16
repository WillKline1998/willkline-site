"use client";

import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { formatKm, formatMiles } from "@/lib/geo";
import { ACCENT, MAP_STYLE } from "@/lib/map";
import { configureMapWorker } from "@/lib/map-worker";

/** Other parts of the page ask the map to fly somewhere by sending this event with a bounding box. */
export const FLY_EVENT = "cleanup:fly";
export type FlyDetail = [[number, number], [number, number]];

/**
 * The globe: every member's clean-up drawn as a line on a 3D Earth that turns slowly until you touch it.
 * Click a line to see who cleaned it, when and how far. Plain MapLibre GL (BSD-3-Clause) with free
 * OpenFreeMap tiles; the line data is our own /cleanup/routes.
 */
export function CleanupMap() {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [spinning, setSpinning] = useState(true);
  const spinRef = useRef(true);
  const [failed, setFailed] = useState(false);
  const [flat, setFlat] = useState(false);

  useEffect(() => {
    if (!box.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    configureMapWorker();
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({ container: box.current, style: MAP_STYLE, center: [-30, 25], zoom: 1.9, attributionControl: { compact: true } });
    } catch {
      // No WebGL (an old browser, or a locked-down one): say so instead of showing an empty box.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reports a failed one-off setup
      setFailed(true);
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    map.on("style.load", () => {
      map.setProjection({ type: "globe" });
      const empty = { type: "FeatureCollection" as const, features: [] };
      map.addSource("routes", { type: "geojson", data: empty });
      map.addSource("spots", { type: "geojson", data: empty });
      // Up close: the route itself, with a soft glow. Far away a 1 km line is invisible, so each clean-up
      // also shows as a glowing dot that fades out as you zoom in and the line takes over.
      map.addLayer({ id: "spots-glow", type: "circle", source: "spots", paint: { "circle-color": ACCENT, "circle-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.25, 7, 0.18, 10, 0], "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 9, 7, 16, 10, 20], "circle-blur": 0.8 } });
      map.addLayer({ id: "spots", type: "circle", source: "spots", paint: { "circle-color": ACCENT, "circle-stroke-color": "#fff", "circle-stroke-width": 1.5, "circle-opacity": ["interpolate", ["linear"], ["zoom"], 1, 1, 8, 1, 10, 0], "circle-stroke-opacity": ["interpolate", ["linear"], ["zoom"], 8, 1, 10, 0], "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 3.5, 8, 6, 10, 6] } });
      map.addLayer({ id: "routes-glow", type: "line", source: "routes", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ACCENT, "line-width": ["interpolate", ["linear"], ["zoom"], 8, 6, 14, 16], "line-opacity": 0.28, "line-blur": 4 } });
      map.addLayer({ id: "routes-line", type: "line", source: "routes", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ACCENT, "line-width": ["interpolate", ["linear"], ["zoom"], 8, 2, 14, 5] } });
      fetch("/cleanup/routes")
        .then((r) => r.json())
        .then((lines: GeoJSON.FeatureCollection<GeoJSON.LineString>) => {
          (map.getSource("routes") as maplibregl.GeoJSONSource).setData(lines);
          (map.getSource("spots") as maplibregl.GeoJSONSource).setData({
            type: "FeatureCollection",
            features: lines.features.map((f) => ({ type: "Feature", properties: f.properties, geometry: { type: "Point", coordinates: f.geometry.coordinates[Math.floor(f.geometry.coordinates.length / 2)] } })),
          });
        })
        .catch(() => undefined);
    });

    for (const layer of ["routes-line", "spots"]) {
      map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
    }
    const show = (e: maplibregl.MapLayerMouseEvent) => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      const el = document.createElement("div");
      el.className = "cleanup-popup";
      const title = document.createElement("strong");
      title.textContent = String(p.title);
      const line = document.createElement("span");
      line.textContent = `${p.by} · ${p.on} · ${formatMiles(Number(p.meters))} (${formatKm(Number(p.meters))})${Number(p.bags) ? ` · ${p.bags} bag${Number(p.bags) === 1 ? "" : "s"}` : ""}`;
      el.append(title, line);
      new maplibregl.Popup({ closeButton: true, maxWidth: "260px" }).setLngLat(e.lngLat).setDOMContent(el).addTo(map);
    };
    map.on("click", "routes-line", show);
    map.on("click", "spots", show);

    // Turn slowly until the visitor takes over (or asks for less motion).
    let frame = 0;
    let last = performance.now();
    const spin = (now: number) => {
      if (spinRef.current && !map.isMoving() && map.getZoom() < 3.2) {
        const c = map.getCenter();
        map.jumpTo({ center: [c.lng + ((now - last) / 1000) * 4, c.lat] });
      }
      last = now;
      frame = requestAnimationFrame(spin);
    };
    if (reduced) {
      spinRef.current = false;
      setSpinning(false);
    } else frame = requestAnimationFrame(spin);
    const stop = () => {
      spinRef.current = false;
      setSpinning(false);
    };
    map.on("mousedown", stop);
    map.on("touchstart", stop);
    map.on("wheel", stop);

    const fly = (e: Event) => {
      stop();
      map.fitBounds((e as CustomEvent<FlyDetail>).detail, { padding: 60, maxZoom: 15, duration: 1800 });
      box.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    };
    window.addEventListener(FLY_EVENT, fly);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener(FLY_EVENT, fly);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  if (failed)
    return (
      <p className="cleanup-nomap" role="status">
        This browser can&apos;t draw the globe (it needs WebGL). The list below shows the same clean-ups.
      </p>
    );

  return (
    <div className="cleanup-mapwrap">
      <div ref={box} className="cleanup-map" role="application" aria-label="Globe showing where members have picked up litter" />
      <div className="cleanup-mapbar">
        <button
          type="button"
          className="btn btn-quiet"
          aria-pressed={spinning}
          onClick={() => {
            spinRef.current = !spinRef.current;
            setSpinning(spinRef.current);
          }}
        >
          {spinning ? "Pause spin" : "Spin the globe"}
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          aria-pressed={flat}
          onClick={() => {
            const next = !flat;
            setFlat(next);
            mapRef.current?.setProjection({ type: next ? "mercator" : "globe" });
            if (next) {
              spinRef.current = false;
              setSpinning(false);
            }
          }}
        >
          {flat ? "Show the globe" : "Flat map"}
        </button>
      </div>
    </div>
  );
}
