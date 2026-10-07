# Status Log

Newest first. Every work session ends with an entry: what changed, what's verified, what's next.

## 2026-10-07 (midday) — M3: login + admin for everything
**Done**: Real login (src/lib/auth.ts): scrypt password hashes, DB `Session` (only token hash stored), httpOnly cookie, 30 days, brute-force brake (5 tries → 5 min). `requireAdmin()` gates every admin page AND every Server Action. Admin account via `npm run admin:create` (prompts; never stored in plaintext). `Upload` table records every stored file; /uploads serves any upload except files of hidden documents. Admin tools: **Bulletin** (create/edit/delete posts; attachments by upload or pasted link, reorder, remove, live preview; deleting a post deletes its files), **Documents**, **Bio**, **CV text** (JSON, validated so a typo can't break /cv), **Music** (liner notes, year, order, visibility).
**Verified**: lint + build; scripts/e2e_admin.py = 16/16 PASS (login gate, wrong password, redirect back, post + uploaded image + YouTube on home, file served + deleted with post, document upload/replace/delete, bio round-trip, CV validation, liner notes, logout). Screenshots: docs/mockups/admin_*.png.
**Blocked on Will**: create his admin account once at the Mac: `cd ~/Projects/willkline-site && npm run admin:create`.
**Next**: M4 Inspiration Wall (member accounts) or M7 deploy (needs: Postgres host, file storage, Vercel). CV editor could become a friendly form later.

## 2026-10-07 (late morning) — Bio, CV, configurable documents
**Done**: Bio page (SiteSetting "bio"; draft adapted + lengthened from Will's LinkedIn About, third person). CV page = the CV itself (SiteSetting "cv" JSON, same shape as ~/JobSearch/resume/*.json, **no phone number**) + a Download section listing every published `Document`. Generalized `Document` model replaces ResumeFile. Local storage driver (storage/uploads, gitignored; served by /uploads/[key] only for published docs). /admin/documents: upload with title/description, replace file (same entry), rename, reorder, hide, delete. Admin is gated to local use (dev, or `ADMIN_LOCAL=1 next start`) until M3 login; it 404s otherwise. Starter docs: one-page Résumé + 2-page CV (generated from JobSearch builder, phone stripped).
**Verified**: lint + build; scripts/e2e_documents.py passes (upload, appears on /cv, file served, replace swaps file + old one 404s, delete removes it); /admin/documents 404s without the flag.
**Next**: M3 login so Will can manage everything from anywhere; then admin for bulletin posts (with uploads), bio, and CV text. At deploy, swap the storage driver to cloud storage.

## 2026-10-07 (mid-morning) — design chosen + bulletin attachments
**Done**: Will picked **Quiet Studio**, so it's now the only theme (alternates removed, preserved in c17f2c9). Added `NoticeMedia` (IMAGE / EMBED / FILE / LINK) with faithful rendering: images, YouTube (nocookie) / Vimeo / Spotify / SoundCloud players, direct video, PDF inline preview + file card, link cards. Allowlisted iframes only (src/lib/embeds.ts). Seeded real posts (BECOMING on Spotify, COOKY on SoundCloud) + [Example] flyer/PDF/YouTube posts. Muroki reference captured.
**Verified**: lint + build; full-page screenshot shows every embed rendering (docs/mockups/studio_home_full.png).
**Next**: Bio + CV pages (needs Will's bio text; CV can render from ~/JobSearch/resume/resume_base.json minus phone number); then M3 admin (post/edit notices with uploads).

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
