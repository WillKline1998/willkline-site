<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# willkline.com — Project Rules

Read `docs/PLAN.md` (vision + milestones), `docs/STATUS.md` (latest progress), and `docs/DECISIONS.md` before starting work.

- This is a **portfolio piece**: code quality is part of the product. Small, readable components; no dead code; comments explain *why*.
- **Normal mode must stay clean and fast.** All demo-mode effects are scoped under `[data-mode="demo"]` (CSS) or gated on `useDemoMode()`. Always respect `prefers-reduced-motion`.
- Site sections are defined once in `src/lib/sections.ts`.
- Data model: `prisma/schema.prisma`. Change it via `npm run db:migrate`. Keep it Postgres-compatible (no SQLite-only tricks).
- Prisma client is generated to `src/generated/prisma` (gitignored); import the shared client from `@/lib/db`.
- **Mobile-first, always.** Base CSS is for phones; widen with `@media (min-width: …)` (breakpoints: 640 / 768 / 900). Rules: no horizontal scroll at 320px; tap targets ≥ 40–44px; form inputs ≥ 16px (stops iOS zoom); text ≥ 12px; grid/flex children that hold embeds get `min-width: 0`; tables collapse to stacked rows on phones. The sidebar becomes a top bar + Menu under 768px (src/components/NavShell.tsx).
- Before finishing any task: `npm run lint` and `npm run build` must pass. For UI changes also run `scripts/responsive_audit.py` (phone / small-phone / tablet / desktop; must report 0 issues), and for admin/auth changes run `scripts/e2e_admin.py`.
- End every work session by adding an entry to `docs/STATUS.md` (done / verified / next) and recording notable choices in `docs/DECISIONS.md`.
- Never commit secrets. `.env` is gitignored; document new variables in `.env.example`.
