# Status Log

Newest first. Every work session ends with an entry: what changed, what's verified, what's next.

## 2026-10-09 — License audit + zod
**Done**: Production dependency license audit (all permissive; sharp's libvips is LGPL but dynamically linked, caniuse-lite is CC-BY data). Adopted zod for signup / reset / forgot / Wall-post validation via `src/lib/validation.ts`. See DECISIONS for rejected candidates.
**Verified**: lint + build; e2e_admin, e2e_wall, responsive_audit all pass.
**Next**: DB-backed login/reset rate limiting (current in-memory brake is per-instance).

## 2026-10-08 (night) — Demo mode goes orange
**Done**: Demo palette rebuilt around tangerine/amber/coral/hot pink-orange/gold on dark warm brown (AA text). Animated glow-blob backdrop + grain, glowing gradient headings, nav links that slide/glow/underline, warm glass cards that tilt (alternating lean), glowing pulsing Demo button. Reduced motion keeps palette, drops motion. Fixed the white-rectangle hover bug in the sidebar (see DECISIONS).
**Verified**: lint + build; screenshots docs/mockups/demo_*.png (home, music, phone, nav hover 2nd/3rd, normal mode unchanged).
**Next**: Will reviews on the branch feature/demo-mode.

## 2026-10-09 — Poems keep their line breaks
**Why**: Will's poem (four quatrains) rendered as run-on paragraphs.
**Done**: Writing posts render with `remark-breaks` (`<Markdown lineBreaks>`): one Enter = line break, blank line = new paragraph/stanza. Lab pages keep standard Markdown. The admin formatting tips are now a clear list.
**Verified**: e2e_admin ALL PASS (new check: single newline renders a `<br>`).

## 2026-10-08 (night) — Warmer Quiet Studio + demo fixes
**Why**: Will found the bare white screen harsh ("oppressed by a big white screen") and wanted more substance and a more professional look, staying minimal.
**Done**:
- Palette: warm paper page (#f6f2ec), white cards with a hairline edge and soft lift (`--shadow`), tinted sidebar (`--nav-bg`, extended to the window edge on wide screens), warm ink and muted (AA contrast).
- Sidebar shows the current section with an orange tick (`NavLink`, aria-current).
- Home rail: padded white cards with an orange top bar. The Lab box shows the newest entry (createdAt), now Headroom.
- Demo mode: the toggle shimmer loops seamlessly (same color at both ends, 300% tile like h1). Demo neutralises the new vars.
**Verified**: e2e_admin, e2e_wall ALL PASS; responsive 0 issues; screenshots docs/mockups/warm_*.png.

## 2026-10-08 (evening) — Site email (Resend)
**Done**:
- **Resend:** installed via the Vercel Marketplace (Will accepted the terms). It sets RESEND_API_KEY and RESEND_EMAIL_DOMAIN. `src/lib/email.ts` sends through the Resend REST API. With no key (local and tests), mail is written to `storage/outbox/`.
- **Forgot / reset password:**
  - `/forgot` gives the same answer for known and unknown emails, has a honeypot, and allows 3 requests per hour per account.
  - `/reset` uses a PasswordReset row: sha256 token hash, 1 hour, single-use and claimed atomically. A reset logs the account out everywhere.
  - The login page has a "Forgot your password?" link and a "Password changed" notice.
- **Admin emails:** new Wall member and post reported/auto-hidden notices go to every ADMIN user. On/off switch in /admin/wall (SiteSetting `wall_notify`).
- `/forgot` and `/reset` are disallowed in robots.txt.

**Verified**: e2e_wall 48 (13 new: emails sent, switch, reset flow incl. bad/used/made-up links, short password, logout-everywhere, old password dead); e2e_admin 53; responsive 0 issues (incl. /forgot, /reset).
**Pitfall found**: `vercel integration add` wrote `.env.local` with ALL production secrets, which Next would load over `.env`. Deleted immediately; confirmed 0 test users reached prod.
**DNS done (Will, 2026-10-08 7pm)**: DKIM, SPF MX/TXT and DMARC added at Porkbun; Resend domain **verified**. A live test reset email from hello@willkline.net reached wskline4's Gmail **inbox** (not spam).

## 2026-10-08 (afternoon, part 2) — Repo made public
**Done**: The README is rewritten: what it does, a stack table, design notes pointing at the code, local setup, tests, and a rights note. The hero image is a real capture of the live site (`docs/mockups/readme_home.png`). Untracked and gitignored: `scripts/__pycache__`, integration-installed AI skill packs (`.agents/`, `.claude/`, `skills-lock.json`), and the regenerated `docs/mockups/responsive/`. DECISIONS.md no longer names the Porkbun account.
**Audit**: gitleaks scanned the full history (63 commits) with 0 findings. Manual grep found no phone number, DB or Blob credentials, or chat IDs. The only email in the repo (wskline4) is the public CV contact. Older commits still contain the Porkbun username, which is the same public handle as his DistroKid page.
**Done (Will said "flip it")**: repo is PUBLIC. The Lab entry links to it. PLAN.md credits are kept as-is.

## 2026-10-08 (afternoon) — "Ready to share" polish + Lab entry rewrite
**Done**:
- **Link previews (Open Graph / Twitter):** `src/app/opengraph-image.tsx` generates the site card (1200×630). Release pages use their cover art, Writing posts use their lead picture, and everything else falls back to the site card. `src/lib/seo.ts#openGraph()` exists because Next replaces the parent's openGraph instead of merging it; without it a page loses its site name and image. `metadataBase` is https://willkline.net.
- **Icons:** `icon.tsx` (32px) and `apple-icon.tsx` (180px) draw "WK" on the accent orange. Removed the default favicon.ico and the leftover Next starter SVGs.
- **Search:** `robots.ts` (disallows /admin, /login, /signup, /wall/edit) and `sitemap.ts` (sections, releases, posts, Lab, built live). `admin/layout.tsx` marks all of admin noindex.
- **404:** `not-found.tsx`, "Wrong note.", with links to every section.
- **Lighthouse (mobile, local prod build):** `--muted` changed #8a8a8a → #6b6b6b, which raises contrast from 3.45:1 to 5.3:1. Accessibility went from 95–96 to 100 on every page. The /music grid covers got `sizes`. Every page now scores perf 92–98, a11y 100, SEO 100, best practices 100, **except Home best practices = 77**: Spotify and SoundCloud embeds set third-party cookies. The fix would be "click to load" player facades, a UX call for Will.
- **Lab entry** (willkline-net) rewritten as a representative snapshot ("What it does" / "How it's built") with 16 technologies. Keep it current by editing in place; don't append.

**Verified**: e2e_admin 53, e2e_wall 36, responsive 0 issues (now includes the 404 page).

## 2026-10-08 (midday) — Writing search/sort + home page pass
**Done**:
- /writing has a search box (case-insensitive "contains" on title OR body, `?q=`) and Newest/Oldest pills (`?sort=old`, which keeps `q`). It shows a result count and Clear search, plus a friendly no-match message.
- **Home** is now two columns at ≥1080px. Left: the bulletin, with a posted date on each card; show times are now included (Eastern). Right: an auto-updating "around the site" rail (`src/components/AroundTheSite.tsx`) with upcoming shows (calendar badge), latest release, newest writing, newest media, the latest 3 Wall finds, and the first Lab project. Empty boxes hide. The rail is sticky on desktop and stacks below the bulletin on phones. The H1 is smaller since the sidebar already shows the name.
- **Release years** came from Apple's public catalog (iTunes lookup by album ID) and are written into music.json plus the DB (only where the year was null). Joyful Noise is left blank: Apple shows 2002-01-01, likely a DistroKid placeholder. Confirmed X25 (Aug 2025) is the newest release.

**Verified**: e2e_admin passes 40 (adds search title/body/no-match, sort keeps search, home rail shows the newest post). e2e_wall passes 36. The responsive audit (now including /writing?q=) shows 0 issues.
**For Will**: the seeded bulletin card "New release: BECOMING" predates X25 and Glowing. Edit it or unpin it.

## 2026-10-08 (morning) — Writing & Media simplified, account corner, readable CV (Will's memo)
**Done**:
- **Writing** is an admin-only post maker. The title is required; the body is Markdown. Posts can have one optional lead **picture OR video** (radio picker, `src/components/PictureOrVideo.tsx` + `src/lib/lead-media.ts`; pictures resized to 1600px WebP; video = any web link, embedded when allowlisted). The posting time is stamped on first publish and shown in Eastern time (`src/lib/dates.ts`). Removed `summary` (the list shows an auto excerpt) and the old "insert image into body" uploader. Dropped columns Post.summary and MediaItem.caption (prod had 0 rows).
- **Media** is admin-only: a photo upload (resized to 2000px) OR a video link, plus an optional title. Audio, press, and hosted video files were removed.
- **Account corner**: "Log in" or "Admin · Log out" (members see "@handle · Log out") at the bottom of the sidebar and inside the phone menu. The duplicate log-out on /wall was removed.
- **CV**: a date column on the left for wide screens; title → organization → meta → details; airy bullets with accent markers; music lines parsed into dates/lead/details; education details on separate lines; skills as chips. Tailwind's reset had stripped list markers, so `list-style` is restored for CV and Markdown lists.
- **Admin forms**: radio/checkbox rows were stretched by the width rule (fixed), buttons size to content, and typed text uses the body font.

**Verified**: e2e_admin passes 35 (three consecutive clean runs after fixing a Save-redirect race in the test). e2e_wall passes 36. The responsive audit shows 0 issues. Live is migrated with no advisory locks.

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
