# GoCollabo — AI Creator Marketplace

GoCollabo is a React / TypeScript / Vite / Express / tRPC marketplace backed by Supabase Auth, PostgreSQL with Row Level Security, and Supabase Storage.

## Quick start

```bash
pnpm install
pnpm dev          # Full app on port 3000
pnpm check        # TypeScript validation
pnpm test         # Unit + mocked Supabase tests
pnpm build        # Production bundle → dist/
pnpm start        # Serve dist/index.js + dist/public/
```

### Local Supabase (optional — requires Docker + Supabase CLI)

```bash
pnpm supabase:start   # Spin up local Supabase stack
pnpm supabase:reset   # Apply migrations to the local stack
pnpm supabase:test    # Run pgTAP policy tests
```

See [SETUP.md](SETUP.md) for Auth redirects, Storage policies, deployments, and the legacy MySQL export note.

---

## Architecture

| Layer | Stack |
|-------|-------|
| Frontend | React 18, Vite, wouter, tRPC client, Sonner toasts |
| Backend | Express, tRPC v11, Supabase JS client |
| Database | Supabase PostgreSQL with RLS + triggers |
| Storage | Supabase Storage (`portfolio-media` bucket, images only) |
| Auth | Supabase Auth (email/password + Google OAuth) |

Data model documentation: [`docs/data-model.md`](docs/data-model.md)

---

## Demo guide — verified flows

The following flows work with the local dev server (`pnpm dev`). Steps marked ⚠️ require a configured Supabase project and cannot be verified offline.

### 1. Landing page (no auth required)

1. Open `http://localhost:3000/`.
2. The public landing page renders with hero, feature sections, and navigation.
3. Click **Discover** or **Build your profile** to enter the workspace.

### 2. Demo mode (no auth)

Without signing in, the app operates in **demo mode** with seed creators and briefs stored in `localStorage`.

1. Navigate to `/discover` — four sample creator cards appear.
2. Use the search bar and filter dropdowns (work type, style, mode, sort) to narrow results.
3. Click a creator card to view their profile detail.
4. The **Clear** button resets all active filters.

### 3. Authentication ⚠️

> Requires `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`.

1. Click the **Sign in** button in the top bar.
2. Sign up or sign in via email/password or Google OAuth.
3. After sign-in, the app detects `account_type` and switches to the appropriate workspace (creator or brand).
4. Use the workspace switcher to change between creator and brand roles.

### 4. Creator profile & portfolio ⚠️

1. Sign in as a **creator** account.
2. Navigate to `/creator` — the Profile Studio loads.
3. Fill in profile fields (name, headline, bio, location, work mode, skills, tools, etc.).
4. Click **Save** to upsert via `marketplace.saveProfile`.
5. Toggle **Published** to make the profile publicly visible.
6. Add portfolio projects: title, description, content type, tools, skills, role, challenge, approach, outcomes.
7. Upload an image (JPEG/PNG/WebP/GIF, ≤ 8 MB) to Supabase Storage.
8. Reorder projects via drag handles (calls `reorder_portfolio_projects` RPC).

### 5. Creator discovery (live) ⚠️

1. Sign in as any account.
2. Navigate to `/discover` — live creators are fetched from Supabase via `marketplace.creators`.
3. If the query fails, an error card with a **Retry** button appears.
4. Search, filter, and sort work identically to demo mode but against real data.

### 6. Brand brief creation ⚠️

1. Sign in as a **brand** account.
2. Navigate to `/brand` — the brand workspace shows.
3. Click **New brief** and fill in all required fields (title, objective, content type, style, audience, platform, duration, aspect ratio, deliverables, budget, deadline, location, work mode, licensing).
4. Save as draft, then publish via the status controls.
5. Brief status lifecycle: `draft → published → closed` (enforced by DB trigger).

### 7. Save creators & collaboration requests ⚠️

1. As a brand, browse `/discover` and click the bookmark icon on a creator card.
2. Navigate to `/saved` to see the shortlist.
3. From a creator's profile, click **Collaborate** — select a published brief, write a message, and send.
4. As the targeted creator, navigate to `/requests` to see incoming requests.
5. Accept or decline the request.

---

## Portfolio AI

Portfolio AI is optional and provider-neutral. No provider credentials or implementation are included. Without a provider configured, the AI assist button returns an error; manual Portfolio Studio editing remains fully available.

## Notes

- Supabase is the only active database backend.
- Existing Drizzle/MySQL SQL under `drizzle/` is archived reference only and is not used.
- Demo roles and sample data remain local and are not authenticated marketplace accounts.
