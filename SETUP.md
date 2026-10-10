# FrameFoundry setup

FrameFoundry uses the managed Webdev React/TypeScript/Express/tRPC/Drizzle starter. The project is configured with managed server and MySQL-compatible database capabilities. `pnpm db:migrate` applies the checked-in schema migrations when the managed database is available; `pnpm dev` starts the full app on port 3000.

Authentication uses the starter Manus OAuth integration. No third-party auth key is required. When a visitor is logged out or the app cannot reach its backend, the interface offers a clearly labeled Demo mode backed by localStorage. Demo records are sample data and are not real authenticated users or verified professionals.

Signed-in users choose Creator or Brand from the **Account** selector. This updates only the authenticated user's `accountType`; it does not grant admin privileges. Demo role switching remains local-only. Creator profiles, brand briefs, saved creators, and collaboration requests use authenticated tRPC procedures and MySQL persistence. Public creator and brief listings include published records only. Collaboration requests are visible to their owning brand and the creator profile owner; creators can accept or decline a pending request once.

Migration `0002_wide_sphinx` adds unique indexes so each user can own only one creator profile and a brand cannot save the same creator more than once. Before applying it to an existing database, check for duplicates and resolve them deliberately:

```sql
SELECT userId, COUNT(*) AS profile_count
FROM creator_profiles
GROUP BY userId
HAVING COUNT(*) > 1;

SELECT brandId, creatorId, COUNT(*) AS saved_count
FROM saved_creators
GROUP BY brandId, creatorId
HAVING COUNT(*) > 1;
```

Back up the target database, run these checks against that environment, and apply `pnpm db:migrate` only after duplicate rows have been reviewed. Do not run the migration against production as part of local development or testing.

Portfolio Studio saves creator-owned projects and keeps new projects private until explicitly published. Public creator profiles include published projects only. Migration `0003_sleepy_may_parker` adds project case-study and media metadata fields, permits projects without media, and defaults all existing projects to private. Review old portfolio entries in Studio and publish them individually after confirming their content is public. This migration adds no uniqueness constraint and needs no duplicate-data cleanup.

Portfolio AI assistance and media upload both use the existing Forge server integration. Configure `MANUS_API_URL` and `MANUS_API_KEY` as server-side environment variables to enable them; never expose these values in client configuration. Studio shows a manual editing fallback when either setting is absent. AI results are unsaved drafts and must be reviewed before applying/saving. Uploads accept JPEG, PNG, WebP, and GIF up to 8 MB and store objects through managed storage; MySQL stores only project text and object metadata. A successful upload is attached to a project only after the creator saves that project.

Migration `0003_sleepy_may_parker` has been generated but not applied. Back up the target database and apply `pnpm db:migrate` only in the intended environment after verifying the migration target. Do not run migrations against production as part of local development or testing.

Useful commands are `pnpm check`, `pnpm test`, `pnpm build`, and `pnpm db:migrate`. Payments, full messaging, identity verification, and AI media editing remain out of scope for this MVP.
