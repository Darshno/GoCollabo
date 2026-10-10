# GoCollabo — AI Creator Marketplace

GoCollabo is a React / TypeScript / Vite / Express / tRPC marketplace backed by Supabase Auth, PostgreSQL with Row Level Security, Supabase Storage, and Google Gemini AI assistance for portfolios and brand briefs.

## Quick start

```bash
pnpm install
pnpm dev          # Full app on port 3000
pnpm check        # TypeScript validation
pnpm test         # Unit + mocked Supabase + AI tests
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
| AI Integration | Google Gemini Flash via REST (server-only `GEMINI_API_KEY`) |
| Database | Supabase PostgreSQL with RLS + triggers |
| Storage | Supabase Storage (`portfolio-media` bucket, images only) |
| Auth | Supabase Auth (email/password + Google OAuth) |

Data model documentation: [`docs/data-model.md`](docs/data-model.md)

---

## 3–5 Minute Walkthrough Sequence

For hackathon reviews, evaluations, or live demos, follow this chronological sequence:

1. **Public Discovery & Demo Mode (Minute 1)**
   - Open `/` to view the landing page and design palette (`#0B0D12`, `#F8F7F2`, `#C8F568`, `#8A8D98`).
   - Click **Discover** (`/discover`) to explore sample creators with filters (style, content type, work mode, sort) and filter reset.
2. **Creator Studio & Gemini Portfolio AI (Minute 2)**
   - Sign in as a creator and open **Portfolio Studio** (`/creator/portfolio`).
   - Click **New project**, fill in project notes, and click **Generate draft** (calls `portfolio.assist` via Gemini).
   - Review the structured draft (challenge, approach, outcomes, impact, skills), click **Apply draft to editor**, and manually edit before saving. (AI never auto-publishes).
3. **Brand Workspace & Gemini Brief Assistant (Minute 3)**
   - Switch role to brand via the workspace switcher and navigate to `/briefs/new`.
   - Enter a rough campaign idea in the **AI Brief Assistant** (e.g. *"I need a launch video for my sustainable skincare brand"*).
   - Click **Draft with AI** (calls `briefs.assist`). Notice that budget, deadline, and licensing are safely left unset because they were not specified in the prompt.
   - Enter a budget and deadline, review the editable fields, and click **Publish brief** (transitions `draft → published`).
4. **Shortlisting & Collaboration Workflow (Minute 4–5)**
   - Navigate to `/discover`, bookmark a creator to add them to `/saved`.
   - Open the creator's profile, click **Collaborate**, select your published brief, write an invitation message, and send.
   - Switch back to the creator account and navigate to `/requests` to view, accept, or decline the incoming collaboration request.

---

## Demo guide — verified flows

The following flows work with the local dev server (`pnpm dev`). Steps marked ⚠️ require configured external services (Supabase or Gemini).

### 1. Landing page (no auth required)

1. Open `http://localhost:3000/`.
2. The public landing page renders with hero, feature sections, and navigation.
3. Click **Discover** or **Build your profile** to enter the workspace.

### 2. Demo mode (no auth)

Without signing in, the app operates in **demo mode** with seed creators and briefs stored in `localStorage`.

1. Navigate to `/discover` — sample creator cards appear.
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
6. Open **Portfolio Studio** (`/creator/portfolio`).
7. Add portfolio projects: title, description, content type, tools, skills, role, challenge, approach, outcomes.
8. Upload an image (JPEG/PNG/WebP/GIF, ≤ 8 MB) to Supabase Storage.
9. Reorder projects via drag handles (calls `reorder_portfolio_projects` RPC).

### 5. Gemini Portfolio AI Assistance ⚠️

> Requires `GEMINI_API_KEY` on the server. If unset, the UI displays an informative notice and manual editing remains fully available.

1. In `/creator/portfolio`, create or edit a project.
2. Enter rough project notes or description.
3. Click **Generate draft** to request structured assistance from Gemini.
4. An interactive preview card displays the generated draft.
5. Click **Apply draft to editor** to populate form fields.
6. Review, refine, and explicitly click **Save draft** or **Publish project** (AI never auto-publishes).

### 6. Creator discovery (live) ⚠️

1. Sign in as any account.
2. Navigate to `/discover` — live creators are fetched from Supabase via `marketplace.creators`.
3. If the query fails, an error card with a **Retry** button appears.
4. Search, filter, and sort work identically to demo mode but against real data.

### 7. Brand brief creation & Gemini Brief AI ⚠️

> Requires `GEMINI_API_KEY` on the server for AI generation. If unset, manual brief creation remains fully available.

1. Sign in as a **brand** account and open `/briefs/new`.
2. In the **AI Brief Assistant (Gemini)** card, enter a rough campaign idea (e.g. *"I need a launch video for my sustainable skincare brand"*).
3. Click **Draft with AI**. Gemini generates a structured draft covering title, objective, audience, content type, creative style, platform, aspect ratio, duration, deliverables, and work mode.
4. Budget, deadline, and licensing are safely omitted unless explicitly specified in the campaign idea.
5. Fill in or adjust remaining fields (budget range, deadline).
6. Click **Save draft** or **Publish brief**. AI never saves or publishes automatically.
7. Brief status lifecycle: `draft → published → closed` (enforced by DB trigger).

### 8. Save creators & collaboration requests ⚠️

1. As a brand, browse `/discover` and click the bookmark icon on a creator card.
2. Navigate to `/saved` to see the shortlist.
3. From a creator's profile, click **Collaborate** — select a published brief, write a message, and send.
4. As the targeted creator, navigate to `/requests` to see incoming requests.
5. Accept or decline the request.

---

## AI Implementation & Safety Guardrails

- **Server-Only Credentials**: `GEMINI_API_KEY` is read strictly on the server (`server/portfolio-ai.ts` and `server/brief-ai.ts`). Never exposed to client bundles or environment variables.
- **Provider Architecture**: Implemented using Gemini 1.5 Flash REST API with JSON response format and explicit schemas.
- **Constraint Enforcement**: `briefs.assist` strictly enforces that budgets, deadlines, and licensing rights are never hallucinated or invented; they default to empty strings if not explicitly supplied in the prompt.
- **Explicit User Action Required**: Both AI assistants require explicit user interaction to apply suggestions and separate user actions to save or publish. Auto-publishing is strictly disallowed.
- **Graceful Fallbacks**: If `GEMINI_API_KEY` is missing or upstream rate limits (HTTP 429) occur, the UI displays clear notices, error feedback, and retry controls without blocking manual editing.

---

## Notes

- Supabase is the only active database backend.
- Existing Drizzle/MySQL SQL under `drizzle/` is archived reference only and is not used.
- Demo roles and sample data remain local and are not authenticated marketplace accounts.
