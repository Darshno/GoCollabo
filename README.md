# FrameFoundry — AI Creator Marketplace

React / Express / tRPC / Drizzle starter, adapted from the Sandbox web-db-user template.

- `pnpm dev`: development server; honors `PORT` (default 3000).
- `pnpm build` / `pnpm start`: build and serve `dist/index.js` and `dist/public/`.
- `pnpm db:migrate`: apply checked-in migrations. `pnpm db:push`: generate and apply new schema changes.
- `pnpm check` / `pnpm test`: types and application tests.

Authenticated creator profiles, brand-owned briefs, saved creators, and collaboration requests persist in MySQL through owner-scoped tRPC procedures. Read [SETUP.md](SETUP.md) before applying migrations to an existing database; migration `0002_wide_sphinx` adds uniqueness constraints and requires duplicate-data preflight checks.

Creator Portfolio Studio adds owner-scoped case-study projects and optional Forge-backed AI suggestions and media uploads. Those integrations require server-side `MANUS_API_URL` and `MANUS_API_KEY`; without them the Studio reports the unavailable state and retains manual project editing. Migration `0003_sleepy_may_parker` keeps existing projects private until each is reviewed and published. See [SETUP.md](SETUP.md) before applying it.

Start with the Webdev skill's default-template guide. Platform login, storage, payments and service contracts live in its shared references; read the relevant capability before extending its helper.

`server/_core/publicConfig.ts` exposes only named public runtime values. Private keys stay server-side. The platform serves managed `/manus-storage/` assets; the application does not register a second proxy.

Platform configuration is readable and editable through `webdev.config`. Default settings are initial values, not enforced constraints. The agent may modify the files, commands and configuration or follow the flexible guide for another stack.
