# Archived MySQL migration files

The SQL files in this directory are retained only as historical source material for an explicit MySQL-to-Supabase export/import. They are not part of the active application schema and must not be run by Drizzle or against any database. The Drizzle schema, metadata, configuration, dependency, and package scripts have been removed.

The active database is Supabase PostgreSQL. Its only active migration path is `supabase/migrations/`; apply those migrations using the Supabase CLI only after reviewing the target project and backing up existing data. No automatic import from the old numeric MySQL IDs to Supabase Auth UUIDs is performed.

Migration notes for a separately approved import:

- Map `users.openId` to an explicitly matched Supabase Auth user UUID; never infer identity by email alone.
- Map `creator_profiles.userId` and `brand_profiles.userId` to `profiles.id` UUIDs.
- Preserve creator profile IDs during import only if a deliberate key mapping is made for project, saved-creator, brief, and collaboration foreign keys; otherwise generate new IDs and rewrite all dependent references together.
- Import projects and briefs as private/draft first. Review publication and media access before making any record public.
- Copy media to the private `portfolio-media` bucket and rewrite database values to the new bucket object paths. Do not import old signed URLs as durable media references.
- Validate row counts, foreign-key mappings, owner relationships, publication state, and duplicate saved-creator pairs before directing traffic to the imported project.
