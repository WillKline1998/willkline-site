# willkline.com — Project Plan

_Owner: Will Kline · PM: Hermes · Builder: Hermes / Claude Code · Started 2026-10-05_

## Vision
One home for every part of Will's life — music, CV, media, writing, and future experiments — that doubles as a **portfolio piece** showing quality *and* range. Not a static page: a real piece of software with an admin system, community features, and a **demo mode** that turns the whole site into a showcase of creative front-end work.

## The four pillars
1. **Content hub** — Music, CV, Media, Writing. Clean, fast, readable. "Normal mode."
2. **Demo mode** — "kaleidoscope glasses." One toggle morphs the site into flashy, weird, impressive UI. Shows personality + front-end chops. Must never break normal mode.
3. **Dynamic software** — Will logs in as admin and edits everything (album descriptions, upload a new résumé, publish writing). Proves full-stack skill.
4. **Community + Lab** — Inspiration Wall (visitors share art/music they love, save others' posts into personal collections) and a Lab for small music-software experiments.

## Architecture (initial)
| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript | One codebase for front and back end; TypeScript carries over from Angular work; most in-demand stack, so it adds range beside his Angular/.NET day job |
| Styling | Tailwind CSS 4 + plain CSS for demo effects | Fast to build; demo effects isolated under `[data-mode="demo"]` |
| Database | Prisma ORM · SQLite (local) → Postgres (production) | Zero-setup locally; swap provider at deploy |
| Auth | TBD in M3 (likely Auth.js) | Admin + member roles already modeled |
| File storage | TBD in M3 (Vercel Blob / S3-style) | Résumé PDFs, album art, audio |
| Hosting | TBD in M7 (likely Vercel + managed Postgres) | Free/cheap tier to start |

## Milestones
- **M0 — Scaffold** ✅ Project, routes, nav, demo toggle + starter effects, data model, docs.
- **M1 — Design system & home** Visual identity (type, color, layout), real home/bio, responsive nav, normal-mode polish.
- **M2 — Content sections (read-only)** Music (albums/tracks/audio player), CV (rendered + PDF download), Media gallery, Writing (Markdown posts). Seed with real content.
  - Music catalog requirements (from Will, 2026-10-06): ~10 solo albums + ~5 other projects, every genre, spread across Spotify/Bandcamp (DistroKid), SoundCloud (older, unremastered), YouTube (classical compositions from college). **One page per work** with description, credits/notes and links to every platform; site becomes the single home that unites them. Album model may need a `links` field (platform → URL) and a `kind` (album / EP / composition / project).
  - Lab note: Will uses Ableton + Max/MSP (Max 9) and has built Max patches. Strong candidates for M5 experiments / showcasing existing patches.
- **M3 — Admin & auth** Login, admin role, admin dashboard to create/edit/delete all content, file uploads (résumé, art, audio).
- **M4 — Inspiration Wall** Member sign-up, post art/music links, save to collections, shareable collection pages, basic moderation (admin can remove).
- **M5 — Lab** Project index + first music-software experiment (e.g., Web Audio toy).
- **M6 — Demo mode, for real** The razzle-dazzle: shaders/WebGL, audio-reactive visuals, physics, text effects — whatever's weird and impressive. Respect reduced-motion.
- **M7 — Ship** Domain, hosting, Postgres, analytics, SEO, performance + accessibility pass.

## Open questions (for Will)
- Domain: willkline.com is taken (not Will's). Will wants `willkline` + a cheap, innocuous TLD, and a **dedicated, instructional session** on buying/connecting a domain (registrar, DNS, pricing incl. renewal costs) so he learns it. Candidates free on 2026-10-05: willkline.net, .io, .art; also willklinemusic.com, wskline.com.
- Visual vibe for normal mode — Will is researching. Known so far: simple artist-page structure, content area + **side navigation menu** (Bio, Media, etc.). Sidebar implemented in M0.
- What music/media exists today to seed M2?
- Wall: open sign-up, or invite-only at first? (moderation burden)
