# Decisions

Short record of choices and why, so future sessions (and future Will) don't relitigate them.

- **2026-10-05 · Next.js full-stack over Angular + .NET.** Will already uses Angular/.NET daily; a different modern stack shows range for the portfolio, and one TypeScript codebase is simpler to host. Revisit if he wants a .NET API in the Lab as a deliberate "range" showcase.
- **2026-10-05 · SQLite locally, Postgres in prod.** No accounts needed to start. Schema avoids Postgres-only features (string roles instead of enums) to keep the switch trivial.
- **2026-10-05 · Demo mode is CSS-scoped via `<html data-mode="demo">`.** Effects never leak into normal mode; new effects don't require touching page components.
- **2026-10-05 · Normal mode = artist-page layout.** Sidebar nav (desktop) / top bar (mobile), simple content column. Will's stated preference.
- **2026-10-05 · Code lives on GitHub under WillKline1998** (private repo `willkline-site`).
- **2026-10-05 · Content comes from the database, not hardcoded files.** Required for the admin-editing pillar.
- **2026-10-07 · Domain: willkline.net** registered at Porkbun (account username "willthedude", email wskline4@gmail.com). $12.52/yr flat; auto-renew ON, transfer lock ON, WHOIS privacy ON; expires 2027-10-07. Nameservers = Porkbun default (parked). At M7: add DNS records at Porkbun pointing to the host (e.g., Vercel).
- **2026-10-07 · Note: earlier attempt exists.** Private repos `WillKline1998/personal-site` (C# backend + Angular frontend, Mar 2026) and `WillKline1998/frontend` (Angular, Mar 2026). Found after choosing Next.js; asked Will whether to reuse anything or keep the fresh start.
- **2026-10-07 · Plan to make this repo public** once it's presentable (portfolio piece; his public GitHub is otherwise empty).
