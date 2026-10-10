# FrameFoundry MVP — Implementation & Design Plan

## Product approach
FrameFoundry is a role-aware creator marketplace for AI filmmakers, animators, artists, and brands. The MVP prioritizes one complete loop: creators create and publish honest profiles, brands discover and shortlist talent, brands publish briefs, and creators receive collaboration requests.

The managed React/TypeScript/Express/tRPC/Drizzle starter remains the foundation. Manus OAuth stays the real authentication path. The UI also has an explicitly labeled Demo mode backed by localStorage so the product is useful when the current visitor is not authenticated or the database is unavailable. Demo data is marked as sample data and never presented as verified professionals.

## Data and application structure
- `drizzle/schema.ts`: users plus creator profiles, portfolio projects/media, brand profiles, briefs, saved creators, and collaboration requests.
- `server/db.ts`: database access helpers with ownership-aware reads/writes.
- `server/routers.ts`: public discovery queries plus protected creator/brand mutations.
- `client/src/App.tsx`: route shell, shared navigation, demo/session context, and product routes.
- `client/src/pages/Home.tsx`: marketplace landing and discovery experience.
- `client/src/index.css`: deep navy visual system, typography, surfaces, responsive layout, and motion.
- `public/manus-routes.json`: complete page route manifest for Preview/public routing.

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
1. Add additive schema and ownership-aware database helpers.
2. Add marketplace tRPC endpoints with real auth gates; keep public discovery safe.
3. Replace the starter example page with responsive routes and functional demo-mode flows.
4. Add route manifest and app metadata.
5. Run `pnpm check`, `pnpm test`, `pnpm build`, start Preview, verify health and route manifest, then fix regressions.

## Explicit MVP boundaries
Payments, full messaging, identity verification, AI media editing, and project management remain intentionally out of scope. The schema and route naming leave room for those features later.
