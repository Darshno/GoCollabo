# FrameFoundry setup

FrameFoundry uses React, Express, tRPC, Supabase Auth, Supabase PostgreSQL with Row Level Security, and Supabase Storage. The application sends the signed-in user's Supabase access token to the server; all data helpers use the anon key plus that token. There is no service-role key or parallel database in the application.

## Supabase project

1. Create a Supabase project and save its project URL and anon/publishable key. Do not put a service-role key in this application.
2. Copy `.env.example` to `.env` for local development. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` to the Supabase project values. The Vite variables are embedded in the browser build and must contain only the project URL and anon/publishable key. The server variables are also the anon key; the request JWT supplies the user's identity and RLS permissions.
3. For local development, install Docker Desktop and use `pnpm supabase:start`. The CLI prints local API and anon key values; put those in `.env`. Use `pnpm supabase:reset` to recreate the local database from `supabase/migrations/` and apply seed/test setup. Use `pnpm supabase:stop` when done.
4. The migration creates the Auth-linked `public.profiles` row on signup. Email/password signup and sign-in are implemented. Configure Supabase Auth email confirmation and SMTP as appropriate for the project. In **Authentication → URL Configuration**, set the local Site URL to `http://localhost:3000`, add local redirect URL `http://localhost:3000`, and add the exact HTTPS deployment origin/redirect URL for each deployed environment.
5. The migration creates a private `portfolio-media` bucket, limited to JPEG, PNG, WebP, and GIF images up to 8 MiB. Verify this bucket and its policies under **Storage** after applying migrations. Upload paths are `<auth-user-uuid>/<project-id>/<unique-file-name>`; policy access allows the owner or media attached to a published project on a published creator profile.
6. Run `pnpm supabase:test` against the local Supabase stack to execute the pgTAP RLS tests with separate test users. These tests require the Supabase CLI, Docker, and the `pgtap` extension included with Supabase local development.

## Migrations and legacy data

The active migration path is only `supabase/migrations/`. Review SQL before applying it. For a hosted project, back up the project, link the Supabase CLI to the intended project, verify the linked ref, then run `pnpm dlx supabase db push` as an explicit release step. Do not run that command from normal app startup or point it at production without an approved release and backup. This repository's migrations have not been applied by these instructions.

Historical MySQL SQL is retained under `drizzle/` only for reference. It is excluded from all active scripts and is not read by Supabase CLI. No automatic data conversion is performed. If legacy MySQL data must be retained, make a separate reviewed export/import: map each old `users.openId` to an explicitly verified Supabase Auth UUID (never match identity by email alone), map all owner/foreign keys together, preserve or remap numeric IDs consistently, import projects and briefs as private/draft, copy media into the private bucket and replace URLs with object paths, then compare row counts and ownership/publication states before switching traffic. Do not connect migration tooling to the old or production database during ordinary development.

## Run and deploy

For local development, use `pnpm dev` and open `http://localhost:3000`. The tRPC API is served from the same origin. If Supabase environment is absent, real authentication and database-backed routes report unavailable; demo mode is local sample state only and is never a real identity.

CI should run:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

The production Docker image runs `dist/index.js` and listens on `PORT` (default `3000`). Pass the public Supabase URL and anon key as build arguments because Vite embeds them into the client bundle; provide the same values as runtime `SUPABASE_URL` and `SUPABASE_ANON_KEY` for the server. Example:

```sh
docker build \
  --build-arg VITE_SUPABASE_URL=https://your-project-ref.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key \
  -t framefoundry:<release-tag> .
```

Configure the host to provide runtime `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `PORT`. These Supabase URL/anon values are intentionally public and protected by RLS; do not pass a service-role key. Configure Auth redirect URLs for the deployed origin. Probe `GET /api/health` (expected `{"status":"ok"}`), then verify signup/sign-in, public published discovery, and owner-scoped workflows with non-production accounts.

Keep a previous image for rollback. Rolling back application code does not reverse Postgres migrations; use a separately reviewed recovery plan. Test deployments and migration changes against a non-production Supabase project first.

## Optional integrations

Portfolio AI is behind a provider-neutral server interface and is unavailable unless a provider implementation is deliberately configured. No provider, model, endpoint, or key is included in this project. Manual project editing works without AI. AI suggestions remain unsaved until the user applies and reviews them.

Google Maps, used only by the optional map component, accepts `VITE_GOOGLE_MAPS_API_KEY`; restrict that browser key by allowed HTTP referrers in Google Cloud. It is not required for marketplace/auth/database operation.

Payments, identity verification, full messaging, and AI media editing remain out of scope.
