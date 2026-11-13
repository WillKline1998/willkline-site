"use client";

import { useEffect, useRef, useState } from "react";
import type { DingPattern, Face, StudioMood } from "@/lib/dingdong";
import { claimPlayer, makeSynth, releasePlayer } from "./PlayButton";

// A window into Ding Dong's studio. Hand-rolled on purpose (see docs/RESEARCH-dingdong-studio.md): one rAF loop
// that only writes a CSS transform to one element, so the browser can composite it without re-layout. The loop
// sleeps when the tab is hidden or the studio is scrolled away, and never starts under prefers-reduced-motion.
// Sound is off until the visitor taps "Listen in"; then today's pattern loops on the audio clock.

const W = 100; // the room is laid out in percent of its width (x) and of the floor band (y)
type Spot = { x: number; y: number; pause: number; look?: boolean };
// Places he likes to stand: the keyboard, the window, the speaker, the middle of the rug.
const SPOTS: Spot[] = [
  { x: 24, y: 0.2, pause: 2.6, look: true },
  { x: 50, y: 0.75, pause: 1.6 },
  { x: 76, y: 0.35, pause: 2.2, look: true },
  { x: 38, y: 0.9, pause: 1.2 },
  { x: 64, y: 0.6, pause: 1.8 },
];

const faceSrc = (f: Face) => `/dingdong/dingdong-${f}.svg`;

export function Studio({ day, pattern, mood }: { day: number | null; pattern: DingPattern | null; mood: StudioMood }) {
  const room = useRef<HTMLDivElement>(null);
  const guy = useRef<HTMLDivElement>(null);
  const bobAt = useRef(-1e9); // performance.now() of the last note, for the little hop
  const [on, setOn] = useState(false);
  const [error, setError] = useState("");
  const stopRef = useRef<(() => void) | null>(null);
  const asleep = mood.asleep || !pattern;
  const face: Face = asleep ? "neutral" : on ? "singing" : mood.face;

  // Wandering. Only runs when awake and motion is allowed; writes one transform per frame.
  useEffect(() => {
    const el = guy.current;
    const box = room.current;
    if (!el || !box || asleep) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let visible = true;
    let last = 0;
    let i = 0;
    let pos = { x: SPOTS[0].x, y: SPOTS[0].y };
    let wait = SPOTS[0].pause;
    let walked = 0;
    const speed = 9; // percent of the room width per second: an amble, not a dash
    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0); // clamp, so a stalled tab never teleports him
      last = now;
      const target = SPOTS[(i + 1) % SPOTS.length];
      let tilt = 0;
      let lift = 0;
      if (wait > 0) {
        wait -= dt;
        // Idle: a slow look around (a gentle tilt) at the spots marked `look`.
        if (SPOTS[i].look) tilt = Math.sin(now / 520) * 6;
      } else {
        const dx = target.x - pos.x;
        const dy = (target.y - pos.y) * 30;
        const dist = Math.hypot(dx, dy);
        const step = speed * dt;
        if (dist <= step) {
          pos = { x: target.x, y: target.y };
          i = (i + 1) % SPOTS.length;
          wait = target.pause;
        } else {
          pos = { x: pos.x + (dx / dist) * step, y: pos.y + (dy / 30 / dist) * step };
          walked += step;
          lift = Math.abs(Math.sin(walked * 0.9)) * 4; // footsteps
          tilt = Math.sin(walked * 0.9) * 3;
        }
      }
      // The hop when a note of his tune sounds: up quickly, down over ~250ms.
      const since = (now - bobAt.current) / 1000;
      if (since < 0.25) lift += Math.sin((since / 0.25) * Math.PI) * 10;
      const bw = box.clientWidth;
      const scale = 0.82 + pos.y * 0.18; // further back = a bit smaller
      el.style.transform = `translate(${(pos.x / W) * bw}px, ${pos.y * 18 - lift}px) translateX(-50%) scale(${scale}) rotate(${tilt}deg)`;
      el.dataset.walking = wait > 0 ? "0" : "1";
      if (visible) raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      if (visible && !document.hidden && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) wake();
    });
    io.observe(box);
    const onVis = () => (document.hidden ? (cancelAnimationFrame(raf), (raf = 0)) : wake());
    document.addEventListener("visibilitychange", onVis);
    box.dataset.anim = "on";
    wake();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      delete box.dataset.anim;
    };
  }, [asleep]);

  useEffect(() => () => stopRef.current?.(), []);

  async function toggle() {
    if (on) {
      stopRef.current?.();
      return;
    }
    if (!pattern) return;
    const Tone = window.Tone;
    if (!Tone) {
      setError("The sound player didn't load yet. Try again in a moment.");
      return;
    }
    setError("");
    try {
      await Tone.start(); // inside the tap: iOS Safari only unlocks audio here
    } catch {
      setError("Your browser blocked the sound.");
      return;
    }
    const synth = makeSynth(Tone, pattern.instrument);
    const spb = 60 / pattern.tempo;
    const bar = pattern.beats * spb;
    const log = (window.__dingdong ??= { events: [], playing: null });
    log.events = [];
    log.playing = day;
    const t0 = Tone.now() + 0.08;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let next = 0; // next pass to schedule
    // Look-ahead scheduler: keep ~1.5s of notes queued on the audio clock, one pass of the bar at a time.
    // Each pass reuses the same pattern; a timer per note only drives the hop and the test log.
    const pump = () => {
      while (t0 + next * bar < Tone.now() + 1.5) {
        const pass = next++;
        for (const n of pattern.notes) {
          const at = t0 + pass * bar + n.beat * spb;
          synth.play(n.pitch, n.dur * spb, at);
          const id = setTimeout(
            () => {
              timers.delete(id);
              log.events.push({ day: day ?? 0, beat: n.beat, pitch: n.pitch, time: +at.toFixed(3), pass });
              bobAt.current = performance.now();
            },
            Math.max(0, (at - Tone.now()) * 1000),
          );
          timers.add(id);
        }
      }
    };
    pump();
    const tick = setInterval(pump, 400);
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      clearInterval(tick);
      timers.forEach(clearTimeout);
      synth.dispose();
      setOn(false);
      if (log.playing === day) log.playing = null;
      releasePlayer(stop);
      stopRef.current = null;
    };
    claimPlayer(stop); // a day's Play button below stops the loop, and vice versa
    stopRef.current = stop;
    setOn(true);
  }

  return (
    <figure className="dd-studio" data-face={face} data-asleep={asleep ? "1" : "0"} data-sound={on ? "on" : "off"}>
      <div
        className="dd-room"
        ref={room}
        role="img"
        aria-label={
          asleep
            ? "Ding Dong, a little creature with a screen for a face, asleep in his small dark music room."
            : `Ding Dong, a little creature with a screen for a face, wandering his small dark music room looking ${face}.`
        }
      >
        <RoomArt />
        <div className="dd-guy" ref={guy}>
          {/* Every face is in the DOM once, so swapping is instant (no network fetch mid-song). */}
          {(["happy", "confused", "neutral", "singing"] as Face[]).map((f) => (
            // eslint-disable-next-line @next/next/no-img-element -- tiny static SVGs; next/image adds nothing here
            <img key={f} src={faceSrc(f)} alt="" width={64} height={64} className="dd-face" hidden={f !== face} />
          ))}
          <span className="dd-legs" aria-hidden="true">
            <i />
            <i />
          </span>
          {asleep && (
            <span className="dd-zzz" aria-hidden="true">
              z<small>z</small>
            </span>
          )}
          {on && (
            <span className="dd-notes" aria-hidden="true">
              ♪
            </span>
          )}
        </div>
      </div>
      <figcaption className="dd-studio-bar">
        <span className="dd-studio-caption small">
          {asleep ? (
            <>Ding Dong is asleep in his studio.</>
          ) : (
            <>
              Day {day} in the studio · <span className="muted">{on ? "you're listening in" : mood.why}</span>
            </>
          )}
        </span>
        {!asleep && (
          <button type="button" className="btn dd-listen" onClick={toggle} aria-pressed={on}>
            <span className="dd-speaker" aria-hidden="true">
              {on ? "🔊" : "🔈"}
            </span>
            {on ? "Stop listening" : "Listen in"}
            {on && <span className="dd-live" aria-hidden="true" />}
          </button>
        )}
        {error && (
          <span className="small dd-error" role="status">
            {error}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

// The room itself: one static SVG, drawn once. Calm, dark, a few warm accents from the site palette.
function RoomArt() {
  return (
    <svg className="dd-room-art" viewBox="0 0 400 225" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="ddWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b1714" />
          <stop offset="1" stopColor="#25201b" />
        </linearGradient>
        <radialGradient id="ddLamp" cx="0.82" cy="0.32" r="0.55">
          <stop offset="0" stopColor="#c2410c" stopOpacity="0.28" />
          <stop offset="1" stopColor="#c2410c" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="225" fill="url(#ddWall)" />
      <rect width="400" height="225" fill="url(#ddLamp)" />
      {/* window with a moon */}
      <rect x="150" y="26" width="84" height="64" rx="4" fill="#0e1420" stroke="#3a322a" strokeWidth="4" />
      <path d="M192 28 V88 M152 58 H232" stroke="#3a322a" strokeWidth="3" />
      <circle cx="214" cy="42" r="7" fill="#e9e1cf" opacity="0.85" />
      <circle cx="166" cy="72" r="1.2" fill="#e9e1cf" opacity="0.7" />
      <circle cx="178" cy="40" r="1" fill="#e9e1cf" opacity="0.6" />
      {/* foam panels */}
      <g fill="#2e2822">
        <rect x="18" y="30" width="22" height="22" rx="2" />
        <rect x="44" y="30" width="22" height="22" rx="2" />
        <rect x="18" y="56" width="22" height="22" rx="2" />
        <rect x="44" y="56" width="22" height="22" rx="2" />
      </g>
      {/* floor + rug */}
      <rect y="150" width="400" height="75" fill="#2b241e" />
      <path d="M0 150 H400" stroke="#3a322a" strokeWidth="2" />
      <ellipse cx="200" cy="196" rx="120" ry="18" fill="#3a2a22" />
      <ellipse cx="200" cy="196" rx="100" ry="13" fill="none" stroke="#c2410c" strokeOpacity="0.35" strokeWidth="1.5" />
      {/* desk with a tiny keyboard */}
      <rect x="40" y="118" width="96" height="8" rx="2" fill="#4a3b2f" />
      <rect x="46" y="126" width="5" height="34" fill="#4a3b2f" />
      <rect x="125" y="126" width="5" height="34" fill="#4a3b2f" />
      <rect x="54" y="108" width="68" height="10" rx="2" fill="#d9d2bf" />
      <g fill="#2b2b29">
        {Array.from({ length: 7 }, (_, k) => (
          <rect key={k} x={60 + k * 8.5} y="108" width="4" height="6" />
        ))}
      </g>
      {/* lamp */}
      <path d="M330 150 V78" stroke="#4a3b2f" strokeWidth="3" />
      <path d="M318 82 L342 82 L336 66 L324 66 Z" fill="#c2410c" opacity="0.85" />
      <ellipse cx="330" cy="151" rx="12" ry="3" fill="#4a3b2f" />
      {/* speaker */}
      <rect x="270" y="112" width="34" height="48" rx="3" fill="#1a1613" stroke="#3a322a" strokeWidth="2" />
      <circle cx="287" cy="126" r="6" fill="#2e2822" />
      <circle cx="287" cy="146" r="9" fill="#2e2822" />
    </svg>
  );
}
