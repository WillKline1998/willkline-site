# Status Log

Newest first. Every work session ends with an entry: what changed, what's verified, what's next.

## 2026-10-05 — M0 Scaffold
**Done**
- Next.js 16 + React 19 + TS + Tailwind 4 app created in `~/Projects/willkline-site`.
- Routes: `/`, `/music`, `/cv`, `/media`, `/writing`, `/lab`, `/wall`, `/admin` (placeholders driven by `src/lib/sections.ts`).
- Global nav + demo-mode toggle (persists in localStorage, syncs across tabs) with starter effects: drifting gradient background, shimmering headings, wobbly cards. Honors reduced-motion.
- Prisma 6 + SQLite data model: User, Album, Track, Post, MediaItem, ResumeFile, LabProject, SiteSetting, WallPost, Save. Initial migration applied.
- Docs: PLAN.md, STATUS.md, DECISIONS.md; project rules in AGENTS.md.

**Verified**: `npm run build` and `npm run lint` pass.

**Next**: M1 — design system & real home page. Needs Will's input on visual vibe + bio.
