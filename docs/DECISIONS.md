# Decisions

Short record of choices and why, so future sessions (and future Will) don't relitigate them.

- **2026-10-05 · Next.js full-stack over Angular + .NET.** Will already uses Angular/.NET daily; a different modern stack shows range for the portfolio, and one TypeScript codebase is simpler to host. Revisit if he wants a .NET API in the Lab as a deliberate "range" showcase.
- **2026-10-05 · SQLite locally, Postgres in prod.** No accounts needed to start. Schema avoids Postgres-only features (string roles instead of enums) to keep the switch trivial.
- **2026-10-05 · Demo mode is CSS-scoped via `<html data-mode="demo">`.** Effects never leak into normal mode; new effects don't require touching page components.
- **2026-10-05 · Content comes from the database, not hardcoded files.** Required for the admin-editing pillar.
