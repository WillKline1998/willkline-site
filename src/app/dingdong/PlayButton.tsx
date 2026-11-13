"use client";

import { useEffect, useRef, useState } from "react";
import type { DingPattern } from "@/lib/dingdong";

/* eslint-disable @typescript-eslint/no-explicit-any */
type ToneLib = any;
declare global {
  interface Window {
    Tone?: ToneLib;
    __dingdong?: { events: { day: number; beat: number; pitch: string; time: number; pass?: number }[]; playing: number | null };
  }
}

// One player for the whole page: starting a day (or the studio loop) stops whichever one was playing.
let stopCurrent: (() => void) | null = null;
export function claimPlayer(stop: () => void) {
  if (stopCurrent && stopCurrent !== stop) stopCurrent();
  stopCurrent = stop;
}
export function releasePlayer(stop: () => void) {
  if (stopCurrent === stop) stopCurrent = null;
}

export function makeSynth(Tone: ToneLib, name: string) {
  const env = { attack: 0.005, decay: 0.5, sustain: 0, release: 0.9 };
  const presets: Record<string, () => any> = {
    basic: () => new Tone.Synth({ oscillator: { type: "sine" }, envelope: env }),
    bell: () => new Tone.FMSynth({ harmonicity: 3.01, modulationIndex: 8, envelope: { ...env, decay: 1.2 } }),
    soft: () => new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { ...env, attack: 0.05 } }),
    buzzy: () => new Tone.Synth({ oscillator: { type: "sawtooth" }, envelope: env }),
  };
  const mk = presets[name] || presets.basic;
  const verb = new Tone.Reverb({ decay: 2.2, wet: 0.22 }).toDestination();
  const bus = new Tone.Volume(-8).connect(verb);
  // A round-robin pool of mono voices, so repeated dings on one pitch never cut each other off.
  const voices = Array.from({ length: 8 }, () => mk().connect(bus));
  let i = 0;
  return {
    play: (note: string, dur: number, time: number) => voices[i++ % voices.length].triggerAttackRelease(note, dur, time, 0.8),
    dispose: () => {
      voices.forEach((v) => v.dispose());
      bus.dispose();
      verb.dispose();
    },
  };
}

export function PlayButton({ day, pattern }: { day: number; pattern: DingPattern }) {
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const [error, setError] = useState("");
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanup.current?.(), []);

  async function toggle() {
    if (playing) {
      cleanup.current?.();
      return;
    }
    const Tone = window.Tone;
    if (!Tone) {
      setError("The sound player didn't load. Try again in a moment.");
      return;
    }
    setError("");
    stopCurrent?.();
    try {
      await Tone.start(); // must happen inside the tap (iOS Safari autoplay rule)
    } catch {
      setError("Your browser blocked the sound.");
      return;
    }
    const synth = makeSynth(Tone, pattern.instrument);
    const spb = 60 / pattern.tempo;
    const log = (window.__dingdong ??= { events: [], playing: null });
    log.events = [];
    log.playing = day;
    // Notes go straight onto the audio clock (sample-accurate); timers only move the highlight. No shared
    // Transport, so one day's leftovers can never cut off the next day's tune.
    const t0 = Tone.now() + 0.08;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const n of pattern.notes) {
      const at = t0 + n.beat * spb;
      synth.play(n.pitch, n.dur * spb, at);
      timers.push(
        setTimeout(
          () => {
            log.events.push({ day, beat: n.beat, pitch: n.pitch, time: +at.toFixed(3) });
            setStep(Math.round(n.beat * 2));
          },
          (at - Tone.now()) * 1000,
        ),
      );
    }
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      timers.forEach(clearTimeout);
      // Stop silences at once; the automatic stop waits 1.2s past the bar so the last ding rings out.
      synth.dispose();
      setPlaying(false);
      setStep(-1);
      if (log.playing === day) log.playing = null;
      if (stopCurrent === stop) stopCurrent = null;
      cleanup.current = null;
    };
    timers.push(setTimeout(stop, (t0 - Tone.now() + pattern.beats * spb + 1.2) * 1000));
    stopCurrent = stop;
    cleanup.current = stop;
    setPlaying(true);
  }

  const steps = pattern.beats * 2;
  const midi = (p: string) => {
    const m = /^([A-G])(#|b)?(\d)$/.exec(p);
    if (!m) return 72;
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]!;
    return 12 * (+m[3] + 1) + base + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  };
  const mids = pattern.notes.map((n) => midi(n.pitch));
  const lo = Math.min(...mids);
  const hi = Math.max(...mids);

  return (
    <div className="dd-player">
      <button
        type="button"
        className="btn dd-play"
        onClick={toggle}
        aria-pressed={playing}
        aria-label={`${playing ? "Stop" : "Play"} day ${day}`}
      >
        {playing ? "■ Stop" : "▶ Play"}
      </button>
      <div className="dd-grid" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${steps}, minmax(0, 1fr))` }}>
        {Array.from({ length: steps }, (_, i) => (
          <span key={i} className={`dd-cell${i % 2 === 0 ? " dd-beat" : ""}${step === i ? " dd-now-cell" : ""}`}>
            {pattern.notes
              .filter((n) => Math.round(n.beat * 2) === i)
              .map((n, j) => (
                <i key={j} style={{ bottom: `${10 + (hi > lo ? (midi(n.pitch) - lo) / (hi - lo) : 0.5) * 70}%` }} />
              ))}
          </span>
        ))}
      </div>
      <span className="small muted dd-meta">
        {pattern.notes.length} dings · {Math.round(pattern.tempo)} bpm
      </span>
      {error && (
        <p className="small dd-error" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
