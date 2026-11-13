# Ding Dong's studio: animation research and choice (2026-11-12)

Goal: a small "window into his studio" at the top of /dingdong. One character (the owner's 9 SVG faces), one
small room, gentle wandering, a hop on each note, a face swap while his tune plays. It needs to be cheap on
phones, must not shift the layout, must respect reduced motion, and can only use permissive licenses.

## The assets
`DingDong design/svg/dingdong-*.svg` (happy, sad, angry, confused, disgusted, scared, surprised, neutral,
singing). Each one is `viewBox="0 0 320 320"` (640×640) and about 10 KB, most of it an embedded C2PA
provenance manifest. They share the same body: a beige retro-monitor head, a green CRT face, a neck, and a
cable. Only the face strokes inside the screen change. So these are heads, not full figures: there's no body,
no limbs, and no pose variants. They were copied unchanged to `public/dingdong/`. Their viewBoxes were already
consistent, so nothing needed normalizing, and I didn't redraw anything. In code he gets two small legs and a
walk cycle.

## Options (GitHub stars and SPDX licenses from `gh api repos/<repo>` on 2026-11-12)

| Option | Stars | License | Fit |
|---|---|---|---|
| Hand-rolled SVG + CSS + `requestAnimationFrame` | n/a (platform) | n/a | ✅ No dependencies. A single element's `transform` gets composited by the GPU, with no layout or paint. Enough for 1 sprite in 1 room. |
| PixiJS `pixijs/pixijs` | 48,687 | MIT | A WebGL renderer meant for many sprites and particles or for games. It adds roughly 100–200 KB of min+gzip and a canvas, which would need its own resize, DPR, and accessibility handling. Overkill for one sprite, and the SVG faces would have to be rasterized into textures. |
| lottie-web `airbnb/lottie-web` | 32,400 | MIT | The runtime is MIT, but authoring needs After Effects + Bodymovin (proprietary AE). It plays timelines someone designed in advance. It can't easily do data-driven wandering. The last push was 2025-09, so it's slowing down. |
| Rive `rive-app/rive-wasm` / `rive-react` | 1,022 / 1,189 | MIT (runtimes) | The runtimes are MIT. The Rive editor is a proprietary SaaS (with free and paid tiers). State machines would be great for richer emotions later, but that means a new authoring tool for the owner plus a WASM runtime (~150 KB+). |
| anime.js `juliangarnier/anime` | 74,542 | MIT | A nice tweening API, but a rAF loop already covers walk-to-point plus bob in about 60 lines. |
| GSAP `greensock/GSAP` | 30,539 | none in SPDX (its own "Standard License"; free since 2025 under Webflow, but not OSI) | ❌ Doesn't meet the MIT/Apache/BSD rule. |
| Motion `motiondivision/motion` | 35,098 | MIT | A React-friendly option, but it would be a new dependency for something CSS transforms already handle. |
| Sprite sheets (CSS `steps()`) | n/a | n/a | Needs hand-drawn frames, and we only have face states, not animation frames. |

Supporting references:
- MDN, "Animation performance and frame rate": animating `transform`/`opacity` stays on the compositor, while
  `left`/`top`/`width` triggers layout. https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate
- web.dev, "How to create high-performance CSS animations": stick to transform and opacity, and use
  `will-change` sparingly. https://web.dev/articles/animations-guide
- MDN `requestAnimationFrame`: callbacks are paused in background tabs, so hidden tabs cost nothing.
  https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- MDN `prefers-reduced-motion`. https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- Chris Wilson, "A Tale of Two Clocks" (web.dev): look-ahead scheduling on the AudioContext clock, using timers
  only to top up the queue. This is the pattern the loop uses. https://web.dev/articles/audio-scheduling
- MDN `IntersectionObserver` (used to pause when scrolled offscreen).
- MDN `aspect-ratio` (the fixed 16:9 room box means no layout shift / CLS).

**Choice: hand-rolled SVG/CSS + one rAF loop, with no new dependencies.** It's the simplest approach that
covers everything: one moving element, data-driven paths, and the owner's SVGs used as they are. If he later
wants authored multi-part character animation (blinking, arm gestures, blended emotion transitions), Rive is
the best upgrade path (MIT runtime). The trade-off to weigh then is the proprietary editor.

## What was built (src/app/dingdong/Studio.tsx)
- **Room:** one static inline SVG (wall, window and moon, foam panels, desk with a mini keyboard, lamp,
  speaker, rug) in the site's warm-dark palette with an orange `--accent` glow. It sits in a fixed
  `aspect-ratio: 16/9` box with `contain: layout paint`.
- **Wander:** five "spots" (keyboard, rug, speaker...). He walks between them at about 9% of the room width
  per second, pauses 1.2–2.6 s, and does a slow look-around tilt at some of them. Each frame writes exactly
  one `style.transform` (translate/scale/rotate). Depth comes from a slight scale. The legs are a CSS keyframe
  that runs only while he walks. `dt` is clamped to 50 ms, so he never teleports after the tab has been stalled.
- **Budget:** the loop stops when the tab is hidden (`visibilitychange`) or the studio is scrolled offscreen
  (IntersectionObserver). It never starts under `prefers-reduced-motion` (static pose on the rug), when he's
  asleep, or without JS.
- **Bob:** each note's timer stamps `bobAt`. The next frames add a 250 ms sine hop.
- **Sound:** off by default. "Listen in" calls `Tone.start()` inside the tap (iOS), then a look-ahead
  scheduler keeps about 1.5 s of notes queued on the audio clock, one pass of the bar at a time, so the tune
  loops seamlessly until "Stop listening". It reuses `makeSynth` from PlayButton.tsx. One page-wide player
  (`claimPlayer`/`releasePlayer`) means a day's Play button and the studio loop stop each other. While it's
  on, a pulsing green dot and a floating ♪ show.
- **Faces:** the four used faces are in the DOM at once (only one is visible), so a swap is instant and
  doesn't fetch anything mid-song.

## Emotion mapping (src/lib/dingdong.ts `studioMood`, deterministic)
| Newest day | Face | Behavior |
|---|---|---|
| none / malformed pattern / `fallback` (sleepy) day | neutral | asleep: no wandering, "z", no Listen button |
| `likedIt = true` | happy | wanders |
| `likedIt = false` | confused | wanders |
| `likedIt = null` | neutral | wanders |
| tune playing (any awake day) | singing | wanders + hops on notes |

The data only has `likedIt` (boolean, which the cron writes) plus free-text diary/taste. Reading emotion out of
the free text would be guesswork, so the mapping deliberately ignores it. **Hook for later:** add a `mood` field
in the cron's day JSON and the importer, then map it inside `studioMood()`. The other 5 faces (sad, angry,
disgusted, scared, surprised) are already in `public/dingdong/`.
