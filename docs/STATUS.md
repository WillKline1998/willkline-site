# Status Log

Newest first. Every work session ends with an entry: what changed, what's verified, what's next.

## 2026-10-08 (late night, cont.) — Wall: edit posts + optional images (Will's request)
**Done**: /wall/edit/[id] lets the author or admin edit link, title, note, kind and image (replace or remove). An optional image on posts goes through src/lib/images.ts (sharp: auto-rotate, fit inside 1200×1200, strip metadata, WebP q80, max 4 MB input, non-images rejected). Cards show the player if the link has one, otherwise the uploaded image linking to the source plus a "host ↗" line. Wall images display at most 420px tall, uncropped. Deleting a post or removing a member deletes their images. /uploads now uses `Cache-Control: private` so the CDN never keeps deleted or hidden files.
**Verified**: e2e_wall passes 32 checks: non-image rejected, form keeps text after an error, a 4000×3000 upload becomes 1200×900 WebP under 300KB, display height capped, source link, others can't see Edit or open the edit page, author edit plus image removal deletes the file. e2e_admin passes 26. The responsive audit shows 0 issues. **Live smoke test** with a temporary member on willkline.net: 3000×4000 JPEG became 900×1200 WebP; after delete the image returns 404; the temp user and post were removed.

## 2026-10-08 (late night) — M4: Inspiration Wall (live; sign-ups CLOSED pending Will)
**Done**:
- /signup: name, @handle, email, password. Bot traps (honeypot field plus a 3-second minimum) and a site-wide cap of 20 sign-ups/hour. Sign-ups are off unless SiteSetting `wall_signups` = "open". Login sends members to /wall and the admin to /admin.
- /wall: a masonry feed, filters (Music/Video/Art/Other), and an "Older →" cursor. Members share a link with a title and note; kind is guessed from the URL and can be overridden. Players come from embeds.ts, direct image links render as art (no referrer), and anything else becomes a link card. Members get 10 posts/day. Save/unsave with counts; logged-out Save sends you to login.
- /wall/u/[handle]: a public member page with Collection (saves) and Shared.
- Moderation: authors delete their own posts and the admin deletes anything. WallReport allows one report per person per post, and 3 distinct reporters auto-hide a post. /admin/wall has the sign-up open/close switch, posts (hidden and reported first) with hide/unhide/delete, and members with remove (cascades).
- `vercel-build` (scripts/vercel-build.sh) migrates only when VERCEL_ENV=production. prisma.config.ts uses DATABASE_URL_UNPOOLED, since the advisory lock fails on Neon's pooler.

**Incident**: the first deploy failed with P1002 (advisory lock timeout). An idle pgbouncer session from an earlier migrate run through the pooler still held the lock. I terminated it with pg_terminate_backend and pointed the CLI at the direct URL, and the redeploy succeeded. Also, hand-made migrations need **UTC** timestamps (`date -u`); local time sorted them before init.

**Verified**: e2e_wall passes 22 checks (bot traps, duplicate handle, post plus player, filters, saves and collections, permissions, one-person reports don't hide, admin hide/unhide, owner delete, closed sign-ups). e2e_admin passes 26 twice. The responsive audit shows 0 issues. Live: /wall and /signup return 200, the migration status is up to date, and no advisory locks are held.

**Open questions for Will**: open sign-ups now, or keep them invite-only/closed? No email is wired up yet, so there's no password reset or email verification for members.

## 2026-10-07 (night) — Media, Writing, Lab, friendly CV editor (all live)
**Done**:
- **Media** (/media): photo grid with a pure-CSS lightbox, video and audio players (YouTube, Vimeo, Spotify, SoundCloud, or uploaded files), and press quotes with links. Admin at /admin/media: add by upload or link, title/caption, order, visibility, delete.
- **Writing** (/writing, /writing/[slug]): Markdown posts via react-markdown (no raw HTML). A paragraph that is just a YouTube/Spotify/etc. link becomes a player. Drafts are visible only to the admin, with a banner. Admin: create a draft, edit the slug/summary/body, publish (stamps publishedAt the first time), upload an image and append it to the body, delete.
- **Lab** (/lab, /lab/[slug]): cards with a status badge (Idea / In progress / Live), tech chips, Try it / Code / Read more links. Write-up pages use Markdown. Admin: create (starts hidden) and edit all fields. First entry is willkline.net (added on prod via a one-off script).
- **CV editor**: /admin/cv is now a section-by-section form (jobs with bullets one per line, schools, music lines, "Label: list" skills, add/remove/order). The raw JSON editor moved to /admin/cv/raw. The public CV skips blank entries.
- **Seed is now FILL-ONLY**: it never overwrites or deletes. Verified by editing the bio/notes/notices and re-seeding.
- Audio files play inline (embeds.ts `audio` kind).

**Verified**: lint and build pass. e2e_admin passes 26 checks, twice: media players and press, draft privacy, publish, Markdown and embed in posts, lab hidden→visible, CV form save with no edits is lossless, adding a job shows on /cv. The responsive audit covers 20 pages × 4 viewports with 0 issues. Live pages all return 200.

**Next**: M4 Inspiration Wall (needs a Neon branch for preview deploys first). Optional later: client-direct Blob uploads for video over 4.5 MB.

## 2026-10-07 (evening) — M7: LIVE at https://willkline.net
**Done**: Vercel project willkline-site (account willkline1998, Hobby), GitHub-connected: every push to main deploys production. Neon Postgres (free, via Vercel integration; env DATABASE_URL + DATABASE_URL_UNPOOLED) — local dev now Homebrew Postgres 17 too. Vercel Blob private store `willkline-uploads` (BLOB_READ_WRITE_TOKEN) behind src/lib/storage.ts. Prisma switched to engine-less client (engineType="client" + @prisma/adapter-pg) after Vercel couldn't find the native engine. `vercel-build` = migrate deploy + next build. Production seeded. DNS at Porkbun: A @ 216.198.79.1, CNAME www → 43aa37c1dae9c2e5.vercel-dns-017.com; www 308-redirects to apex. Cert issued manually via `vercel certs issue`.
**Verified**: https://willkline.net home/cv/login 200; résumé PDF streams from Blob; e2e_admin ALL PASS locally on Postgres.
**Blocked on Will**: `npm run admin:create:prod` (creates his live admin login).
**Known limits / next**: uploads ≤4.5MB (Vercel body cap) → client-direct Blob uploads for video later; preview deployments share the prod DB → give previews a Neon branch before M4 (public sign-ups).

## 2026-10-07 (afternoon) — Responsive / mobile foundation
**Done**: Mobile-first pass. Phones get a compact sticky top bar (name + one-line tagline + Menu button) that unfolds the nav and closes after you pick a page; ≥768px keeps the sidebar. Fixed: bulletin cards overflowing (grid min-width), admin Documents/Music/Bulletin overflowing (stacked rows, fluid inputs), small tap targets (44px nav/menu/demo, 40px buttons), 11px labels → 12px, CV skills/rows wrap, PDF preview capped to 70vh, fluid title size, 16px inputs. Rules written into AGENTS.md.
**Verified**: scripts/responsive_audit.py: 15 pages × 4 viewports (320, 390, 768, 1366) = 0 issues (overflow / tap targets / tiny text) + phone menu open→navigate→close + sidebar on tablet/desktop. e2e_admin still ALL PASS. Overview: docs/mockups/phone_overview.png.
**Not covered**: real iPhone Safari quirks (only Chrome emulation). Will to sanity-check on his phone once the site is reachable.

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
