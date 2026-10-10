# FrameFoundry MVP — Implementation & Design Plan

## Product approach
FrameFoundry is a role-aware creator marketplace for AI filmmakers, animators, artists, and brands. The MVP prioritizes one complete loop: creators create and publish honest profiles, brands discover and shortlist talent, brands publish briefs, and creators receive collaboration requests.

The managed React/TypeScript/Express/tRPC starter remains the foundation. Supabase Auth with PostgreSQL Row Level Security is the real authentication and authorization path; the server sends the caller's Supabase access token and never uses a service-role key. The UI also has an explicitly labeled Demo mode backed by localStorage so the product is useful when the current visitor is not authenticated or the database is unavailable. Demo data is marked as sample data and never presented as verified professionals.

## Data and application structure
- `supabase/migrations/20261010000100_framefoundry_initial.sql`: active PostgreSQL schema, triggers, RPCs, grants, and RLS policies.
- `supabase/tests/marketplace_rls.test.sql`: pgTAP tests that assert the RLS and status-transition rules.
- `server/supabase.ts`: anon-key Supabase clients bound to the request user's JWT.
- `server/_core/context.ts`: verifies the Supabase Auth JWT and loads the account type from the database.
- `server/db.ts`: Supabase data-access helpers with ownership-aware reads/writes.
- `server/routers.ts`: public discovery queries plus protected creator/brand mutations.
- `server/portfolio-ai.ts`: provider-neutral portfolio AI interface, unconfigured by default.
- `client/src/App.tsx`: route shell, shared navigation, demo/session context, and product routes.
- `client/src/pages/Home.tsx`: marketplace landing and discovery experience.
- `client/src/pages/PortfolioStudio.tsx`: authenticated portfolio CRUD, reorder, publish, and direct Storage uploads.
- `client/src/index.css`: deep navy visual system, typography, surfaces, responsive layout, and motion.
- `client/public/routes.json`: complete page route manifest for Preview/public routing.

## Design system
- **Design movement:** editorial creative-tech / studio index — a premium index of work rather than a generic SaaS dashboard.
- **Core principles:** work-first visual hierarchy, quiet confidence, explicit trust signals, and progressive disclosure.
- **Color philosophy:** deep navy creates a gallery-like backdrop; warm white keeps portfolio content legible; indigo is reserved for action and focus; acid-lime is a small ownable signal for availability and live states.
- **Layout paradigm:** persistent rail + wide canvas; creator work appears in asymmetric editorial grids, while forms use a focused single-question stage.
- **Signature elements:** small uppercase metadata labels, hairline dividers, image crops with numeric index tags, and a lime “available” marker.
- **Interaction philosophy:** every action returns visible state — saved, drafted, published, sent, or filtered — with no silent controls.
- **Animation:** short opacity/translate transitions only for panel changes, hover image scale, and success states; no looping decoration.
- **Typography:** Inter for utility and body copy; a high-contrast serif accent for major editorial headlines using Georgia fallback.
- **Brand essence:** “A professional index for the people shaping what comes next.” Personality: discerning, direct, generous.
- **Brand voice:** confident and specific. Examples: “Find the visual voice your brief is missing.” / “Publish the work you actually want to be hired for.”
- **Wordmark:** `frame` in compact sans with a square bracket mark suggesting a film frame; `foundry` in lighter weight.
- **Signature color:** signal lime `#C7F36B`, used sparingly for live/available states.

## Build workflow
1. Add additive schema, RLS policies, and ownership-aware database helpers.
2. Add marketplace tRPC endpoints with real auth gates; keep public discovery safe.
3. Replace the starter example page with responsive routes and functional demo-mode flows.
4. Add route manifest and app metadata.
5. Run `pnpm check`, `pnpm test`, `pnpm build`, start Preview, verify health and route manifest, then fix regressions.

## Database and archive note
The only active database is Supabase PostgreSQL. Historical MySQL/Drizzle SQL under `drizzle/` is archived reference for a manual, reviewed export/import only and is never executed. See `drizzle/README.md` and `SETUP.md` for the import plan.

## Explicit MVP boundaries
Payments, full messaging, identity verification, AI media editing, and project management remain intentionally out of scope. The schema and route naming leave room for those features later.
