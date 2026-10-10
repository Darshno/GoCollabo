# FrameFoundry — AI Creator Marketplace

FrameFoundry is a React / TypeScript / Vite / Express / tRPC marketplace backed by Supabase Auth, PostgreSQL with Row Level Security, and Supabase Storage.

- `pnpm dev`: run the full app on port 3000.
- `pnpm check`: TypeScript validation.
- `pnpm test`: unit, mocked Supabase, and router tests.
- `pnpm build` / `pnpm start`: build and serve `dist/index.js` and `dist/public/`.
- `pnpm supabase:start`, `pnpm supabase:reset`, `pnpm supabase:test`: run local Supabase, apply migrations to the local stack, and run pgTAP policy tests. Docker and the Supabase CLI are required.

Supabase is the only active database backend. Review [SETUP.md](SETUP.md) for local development, Auth redirects, Storage policies, deployments, migrations, and the explicit legacy MySQL export/import plan. Existing Drizzle/MySQL SQL under `drizzle/` is archived reference only and is not used by the app or migration scripts.

Portfolio AI is optional and provider-neutral; no provider credentials or implementation are included. Without one, manual Portfolio Studio editing remains available. Supabase Auth identifies real users; demo roles and sample data remain local and are not authenticated marketplace accounts.
