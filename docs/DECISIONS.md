# Decisions

Short record of choices and why, so future sessions (and future Will) don't relitigate them.

- **2026-10-05 · Next.js full-stack over Angular + .NET.** Will already uses Angular/.NET daily; a different modern stack shows range for the portfolio, and one TypeScript codebase is simpler to host. Revisit if he wants a .NET API in the Lab as a deliberate "range" showcase.
- **2026-10-05 · SQLite locally, Postgres in prod.** No accounts needed to start. Schema avoids Postgres-only features (string roles instead of enums) to keep the switch trivial.
- **2026-10-05 · Demo mode is CSS-scoped via `<html data-mode="demo">`.** Effects never leak into normal mode; new effects don't require touching page components.
- **2026-10-05 · Normal mode = artist-page layout.** Sidebar nav (desktop) / top bar (mobile), simple content column. Will's stated preference.
- **2026-10-05 · Code lives on GitHub under WillKline1998** (private repo `willkline-site`).
- **2026-10-05 · Content comes from the database, not hardcoded files.** Required for the admin-editing pillar.
- **2026-10-07 · Domain: willkline.net** registered at Porkbun. Auto-renew, transfer lock and WHOIS privacy on. DNS points at Vercel (apex A record; www redirects to the apex). At M7: add DNS records at Porkbun pointing to the host (e.g., Vercel).
- **2026-10-07 · Note: earlier attempt exists.** Private repos `WillKline1998/personal-site` (C# backend + Angular frontend, Mar 2026) and `WillKline1998/frontend` (Angular, Mar 2026). Found after choosing Next.js; asked Will whether to reuse anything or keep the fresh start.
- **2026-10-07 · Plan to make this repo public** once it's presentable (portfolio piece; his public GitHub is otherwise empty).

## 2026-10-08 — Demo backdrop is a fixed, transform-animated layer
The old demo animated `background-position` on the body (propagated to the canvas), forcing full-viewport repaints each frame with a transparent sticky sidebar over it; hovering nav links re-rasterised tiles and flashed an unpainted (white) rectangle between sidebar and page. Now `<html>` has an opaque dark base and the gradient is a `position: fixed` pseudo-element moved with `transform` (compositor only). Could not reproduce the flash in headless Chrome, so the fix is by diagnosis plus removal of the repaint path.

## 2026-10-07 — Hand-rolled auth instead of a library
scrypt (node:crypto) + database sessions, ~70 lines in src/lib/auth.ts. Auth.js/Lucia would add a dependency and config for a site with one admin; this is small enough to read in one sitting (and is itself portfolio material). Revisit if social login is wanted for Wall members (M4).

## 2026-10-07 — Uploads go through one storage module
src/lib/storage.ts (save/read/delete + Upload table). Local disk for now (storage/, gitignored). At deploy, swap the driver for cloud storage (Vercel Blob/S3) without touching pages.

## 2026-10-07 — CV text stored as JSON
Same shape as ~/JobSearch/resume/*.json so résumé builds and the site share one source. v1 editor is raw JSON with validation; a section-by-section form can come later.
