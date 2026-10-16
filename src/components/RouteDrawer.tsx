"use client";

import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HIDE_ENDS_M as HIDE_M, formatKm, formatMiles, lengthM, trimEnds, type LngLat } from "@/lib/geo";
import { ACCENT, MAP_STYLE, PLACE_SEARCH } from "@/lib/map";
import { configureMapWorker } from "@/lib/map-worker";

type Mode = "streets" | "straight" | "free";
type Segment = { kind: Mode | "start"; coords: LngLat[] };

const MODES: { id: Mode; label: string; help: string }[] = [
  { id: "streets", label: "Follow streets", help: "Tap each corner or intersection you walked. The line snaps to the street between them." },
  { id: "straight", label: "Straight lines", help: "Tap points; they are joined with straight lines. Good for paths and parks the street map doesn't know." },
  { id: "free", label: "Freehand", help: "Press and drag to draw the way you walked, like through a canyon or along a beach. Lift to stop; drag again to carry on." },
];

/** The route so far: every segment's points joined into one line (each segment starts where the last ended). */
/** Ask our own server for a street route (it spaces calls out for the free routers behind it and caches them). */
async function snap(body: object): Promise<LngLat[]> {
  const res = await fetch("/cleanup/snap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = (await res.json().catch(() => ({}))) as { line?: LngLat[]; error?: string };
  if (!res.ok || !j.line) throw new Error(j.error ?? "Couldn't reach the street router.");
  return j.line;
}

const flatten = (segments: Segment[]): LngLat[] => segments.flatMap((s, i) => (i === 0 ? s.coords : s.coords.slice(1)));

/**
 * Draw the route you cleaned, on a flat map. Three ways to draw, one undo, a live distance, and a preview
 * of exactly what will be public (the start and end are hidden unless you say otherwise).
 */
export function RouteDrawer({ hideEnds, onChange }: { hideEnds: boolean; onChange: (line: LngLat[]) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const [mode, setMode] = useState<Mode>("streets");
  const modeRef = useRef<Mode>("streets");
  const [segments, setSegments] = useState<Segment[]>([]);
  const segRef = useRef<Segment[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [place, setPlace] = useState("");
  const [failed, setFailed] = useState(false);
  const stroke = useRef<LngLat[] | null>(null);

  const commit = useCallback((next: Segment[]) => {
    segRef.current = next;
    setSegments(next);
  }, []);

  const line = useMemo(() => flatten(segments), [segments]);
  const meters = lengthM(line);
  const shown = useMemo(() => (hideEnds ? trimEnds(line, HIDE_M) : line), [hideEnds, line]);

  useEffect(() => onChange(line), [line, onChange]);

  // Draw what we have: the whole walk dashed grey underneath, the public part in orange on top.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const feature = (coords: LngLat[]) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: coords.length > 1 ? coords : [] } });
    (map.getSource("draft-all") as maplibregl.GeoJSONSource | undefined)?.setData(feature(line));
    (map.getSource("draft-public") as maplibregl.GeoJSONSource | undefined)?.setData(feature(shown ?? []));
    const dots = segments.map((s) => s.coords[s.coords.length - 1]).filter(Boolean);
    (map.getSource("draft-dots") as maplibregl.GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: (segments[0] ? [segments[0].coords[0], ...dots] : []).filter(Boolean).map((c) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: c } })),
    });
  }, [line, shown, segments]);

  useEffect(() => {
    if (!box.current) return;
    configureMapWorker();
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({ container: box.current, style: MAP_STYLE, center: [-81.69, 41.5], zoom: 13, attributionControl: { compact: true } });
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reports a failed one-off setup
      setFailed(true);
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      const empty = { type: "FeatureCollection" as const, features: [] };
      map.addSource("draft-all", { type: "geojson", data: empty });
      map.addSource("draft-public", { type: "geojson", data: empty });
      map.addSource("draft-dots", { type: "geojson", data: empty });
      map.addLayer({ id: "draft-all", type: "line", source: "draft-all", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#6b6b6b", "line-width": 3, "line-dasharray": [1.5, 2] } });
      map.addLayer({ id: "draft-glow", type: "line", source: "draft-public", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ACCENT, "line-width": 10, "line-opacity": 0.25, "line-blur": 3 } });
      map.addLayer({ id: "draft-public", type: "line", source: "draft-public", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ACCENT, "line-width": 4 } });
      map.addLayer({ id: "draft-dots", type: "circle", source: "draft-dots", paint: { "circle-radius": 5, "circle-color": "#fff", "circle-stroke-color": ACCENT, "circle-stroke-width": 2.5 } });
      readyRef.current = true;
      // Draw whatever was done before the style finished loading.
      commit([...segRef.current]);
    });

    // Tap to add a point (streets and straight modes).
    map.on("click", (e) => {
      if (modeRef.current === "free") return;
      const p: LngLat = [e.lngLat.lng, e.lngLat.lat];
      const segs = segRef.current;
      const from = segs.length ? segs[segs.length - 1].coords.at(-1)! : null;
      if (!from) return commit([{ kind: "start", coords: [p] }]);
      if (modeRef.current === "straight") return commit([...segs, { kind: "straight", coords: [from, p] }]);
      // Follow streets: ask the walking router for the way between the two taps.
      setBusy(true);
      setNote(null);
      snap({ kind: "walk", from, to: p })
        .then((path) => commit([...segRef.current, { kind: "streets", coords: [from, ...path.slice(1, -1), p] }]))
        .catch((err: Error) => {
          commit([...segRef.current, { kind: "straight", coords: [from, p] }]);
          setNote(`${err.message} That piece is a straight line for now. Undo and try again, or switch to Straight lines or Freehand.`);
        })
        .finally(() => setBusy(false));
    });

    // Freehand: press and drag. The map stops panning while this mode is on (see the mode effect).
    const begin = (e: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) => {
      if (modeRef.current !== "free") return;
      const segs = segRef.current;
      const from = segs.length ? segs[segs.length - 1].coords.at(-1)! : null;
      stroke.current = [from ?? [e.lngLat.lng, e.lngLat.lat]];
    };
    const move = (e: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) => {
      const s = stroke.current;
      if (!s) return;
      const p: LngLat = [e.lngLat.lng, e.lngLat.lat];
      // A point every few metres is plenty; more only slows the line down.
      if (lengthM([s[s.length - 1], p]) < 4) return;
      s.push(p);
      const so_far = segRef.current.length ? [...flatten(segRef.current), ...s.slice(1)] : s;
      (map.getSource("draft-all") as maplibregl.GeoJSONSource).setData({
        type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: so_far },
      });
    };
    const end = () => {
      const s = stroke.current;
      stroke.current = null;
      if (!s) return;
      if (s.length < 2) {
        if (!segRef.current.length) commit([{ kind: "start", coords: [s[0]] }]);
        return;
      }
      commit(segRef.current.length ? [...segRef.current, { kind: "free", coords: s }] : [{ kind: "start", coords: [s[0]] }, { kind: "free", coords: s }]);
    };
    map.on("mousedown", begin);
    map.on("touchstart", begin);
    map.on("mousemove", move);
    map.on("touchmove", move);
    map.on("mouseup", end);
    map.on("touchend", end);
    map.on("touchcancel", end);

    return () => {
      readyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, [commit]);

  // In freehand mode a drag draws; otherwise it moves the map.
  useEffect(() => {
    modeRef.current = mode;
    const map = mapRef.current;
    if (!map) return;
    const free = mode === "free";
    if (free) {
      map.dragPan.disable();
      map.touchZoomRotate.disableRotation();
    } else {
      map.dragPan.enable();
      map.touchZoomRotate.enableRotation();
    }
    map.getCanvas().style.cursor = "crosshair";
    map.getCanvas().style.touchAction = free ? "none" : "";
  }, [mode]);

  const search = async () => {
    const q = place.trim();
    if (!q || !mapRef.current) return;
    setNote(null);
    try {
      const r = await fetch(`${PLACE_SEARCH}?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`);
      const hit = ((await r.json()) as { lat: string; lon: string }[])[0];
      if (!hit) return setNote(`Couldn't find “${q}”. Try a town or street name.`);
      mapRef.current.flyTo({ center: [Number(hit.lon), Number(hit.lat)], zoom: 15 });
    } catch {
      setNote("The place search isn't answering. You can still pan and zoom the map by hand.");
    }
  };

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (pos) => mapRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 16 }),
      () => setNote("Couldn't get your location. Search for a place instead."),
      { timeout: 8000 },
    );

  // Pull the last freehand stroke onto the streets it follows.
  const snapLast = () => {
    const segs = segRef.current;
    const last = segs[segs.length - 1];
    if (!last || last.kind !== "free") return;
    setBusy(true);
    setNote(null);
    snap({ kind: "match", shape: last.coords })
      .then((path) => commit([...segRef.current.slice(0, -1), { kind: "streets", coords: [last.coords[0], ...path.slice(1, -1), last.coords[last.coords.length - 1]] }]))
      .catch((err: Error) => setNote(`${err.message} Your freehand line is unchanged.`))
      .finally(() => setBusy(false));
  };

  const undo = () => {
    const segs = segRef.current;
    commit(segs.length <= 1 ? [] : segs.slice(0, -1));
    setNote(null);
  };

  if (failed)
    return <p className="form-error" role="alert">This browser can&apos;t draw the map (it needs WebGL), so a route can&apos;t be drawn here. Try another browser or your phone.</p>;

  return (
    <div className="drawer">
      <div className="drawer-modes" role="radiogroup" aria-label="How to draw">
        {MODES.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} className={`drawer-mode${mode === m.id ? " on" : ""}`} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <p className="small muted drawer-help">{MODES.find((m) => m.id === mode)!.help}</p>
      <div className="drawer-find">
        <input type="search" value={place} placeholder="Find a place: a town, a park, a street…" aria-label="Find a place" onChange={(e) => setPlace(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void search())} />
        <button type="button" className="btn btn-quiet" onClick={() => void search()}>Go</button>
        <button type="button" className="btn btn-quiet" onClick={locate}>Use my location</button>
      </div>
      <div ref={box} className="drawer-map" role="application" aria-label="Map to draw your route on" />
      <div className="drawer-bar">
        <output className="drawer-dist" data-testid="distance" aria-live="polite">
          {line.length > 1 ? <>{formatMiles(meters)} <span className="muted">({formatKm(meters)})</span></> : "Tap the map to start"}
        </output>
        {busy && <span className="small muted" role="status">Snapping to the street…</span>}
        <span className="drawer-spacer" />
        {segments[segments.length - 1]?.kind === "free" && (
          <button type="button" className="btn btn-quiet" onClick={snapLast} disabled={busy}>Snap this stroke to streets</button>
        )}
        <button type="button" className="btn btn-quiet" onClick={undo} disabled={!segments.length}>Undo</button>
        <button type="button" className="btn btn-quiet" onClick={() => commit([])} disabled={!segments.length}>Clear</button>
      </div>
      {note && <p className="small form-note" role="status">{note}</p>}
      {hideEnds && line.length > 1 && shown === null && (
        <p className="small form-note" role="status">This walk is too short to hide the start and end (it needs about {HIDE_M * 2 + 100} m). Draw more, or untick the privacy box.</p>
      )}
      {hideEnds && shown && <p className="small muted">Dashed grey is hidden. Only the orange part will be public.</p>}
    </div>
  );
}
