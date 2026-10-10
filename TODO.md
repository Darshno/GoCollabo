# FrameFoundry MVP Acceptance TODO

- [ ] Creators can enter Demo mode or use real Manus OAuth; demo mode is clearly labeled and never claims a demo user is authenticated.
- [ ] Creator onboarding asks one question at a time, retains answers between steps, supports back navigation, saves drafts, generates an editable fallback profile from actual input, previews it, publishes it, and updates it later.
- [ ] Creator profiles show headline, bio, portfolio media, skills, specialization, tools/models, workflow, location, work preferences, supported formats, and `SELF-REPORTED` / `NOT VERIFIED` trust status.
- [ ] Brands can create and edit briefs with objective, content type, style, audience, platform, duration, aspect ratio, deliverables, budget, deadline, location/service radius, remote/on-site preference, and licensing requirements.
- [ ] Discovery supports combined filters, clear filters, sorting, useful empty states, and profile opening; selected filters affect visible results.
- [ ] Brands can save/unsave creators and send a collaboration request linked to a brief; request state is visible.
- [ ] Database schema includes users/roles, creator profiles, projects/media, skills/tools, brand profiles, briefs/deliverables, saved creators, and collaboration requests with timestamps and ownership fields.
- [ ] App exposes loading, error, success, and empty states; responsive layout works on mobile and desktop.
- [ ] `manus-routes.json` declares all user-facing routes; `pnpm check`, tests, and production build pass.
- [ ] Setup docs describe managed database/auth, optional LLM use, demo mode, and out-of-scope features.
