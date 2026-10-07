# Status Log

Newest first. Every work session ends with an entry: what changed, what's verified, what's next.

## 2026-10-07 (morning, power-outage-safe session) — M1/M2 kickoff
**Done** (committed + pushed after every step)
- docs/DESIGN.md: Will's direction (nostalgic self-hosted soloist site; sidebar nav; home = bulletin board, not a hero photo) + reference screenshots (Jeffrey Turner, Maggie Cox).
- Data: `Notice` model (home bulletin: SHOW/RELEASE/NEWS/NOTE, dates, venue, links, pinned); Album gets `kind`, `links` (JSON), `sortOrder`. `npm run db:seed` loads the real catalog + sample notices.
- `scripts/fetch_catalog.py`: pulls 800px cover art (saved to public/covers) + Spotify/Apple/Deezer links for all 12 DistroKid releases; SoundCloud oEmbed art for COOKY/Tempted. Release kind inferred from Apple URLs (X25 = EP).
- Three switchable themes (`?theme=recital|homepage|studio`, src/lib/themes.ts): Recital Program (default), Self-Hosted '07, Quiet Studio.
- Home = bulletin board from DB. /music = cover grid. /music/[slug] = per-release page with listen links.
- Mockups in docs/mockups (compare_A_B_C.png).

**Verified**: lint + build pass; all routes 200 on `next start`; screenshots reviewed.

**Open questions for Will**: theme choice (A/B/C or mix); Kurt Muroki's site URL; what goes on Bio/CV pages; should notices support images?

**Known gaps**: mobile layout not visually verified (headless Chrome can't go narrow enough); `[Example]` notices are placeholders; liner notes empty.

## 2026-10-05 (late) — M0 follow-ups
**Done**: Switched to artist-page layout (sidebar nav on desktop, top bar on mobile); added Bio section; pushed to private GitHub repo (WillKline1998/willkline-site).
**Verified**: lint + build pass.
**Next**: Install Claude Code on the Mac (Will). Domain lesson session. M1 once Will has visual references.

## 2026-10-05 — M0 Scaffold
**Done**
- Next.js 16 + React 19 + TS + Tailwind 4 app created in `~/Projects/willkline-site`.
- Routes: `/`, `/music`, `/cv`, `/media`, `/writing`, `/lab`, `/wall`, `/admin` (placeholders driven by `src/lib/sections.ts`).
- Global nav + demo-mode toggle (persists in localStorage, syncs across tabs) with starter effects: drifting gradient background, shimmering headings, wobbly cards. Honors reduced-motion.
- Prisma 6 + SQLite data model: User, Album, Track, Post, MediaItem, ResumeFile, LabProject, SiteSetting, WallPost, Save. Initial migration applied.
- Docs: PLAN.md, STATUS.md, DECISIONS.md; project rules in AGENTS.md.

**Verified**: `npm run build` and `npm run lint` pass.

**Next**: M1 — design system & real home page. Needs Will's input on visual vibe + bio.
