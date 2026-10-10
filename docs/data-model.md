# GoCollabo — Data Model Reference

> Source of truth: [`supabase/migrations/20261010000100_framefoundry_initial.sql`](../supabase/migrations/20261010000100_framefoundry_initial.sql)

---

## Tables

### `profiles`

Created automatically by a trigger when an `auth.users` row is inserted.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `uuid` (PK) | FK → `auth.users(id)` ON DELETE CASCADE | Same UUID as the Supabase Auth user |
| `account_type` | `text` | `CHECK ('creator' \| 'brand')`, default `'creator'` | Determines workspace role |
| `display_name` | `text` | nullable | Populated from `raw_user_meta_data.name` on creation |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, auto-set by trigger | |

### `creator_profiles`

One per creator. Linked 1-to-1 with a `profiles` row via `user_id`.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `bigint` (PK) | identity | |
| `user_id` | `uuid` | UNIQUE, FK → `profiles(id)` ON DELETE CASCADE | |
| `slug` | `text` | UNIQUE, NOT NULL | URL-safe identifier |
| `name` | `text` | NOT NULL | |
| `headline` | `text` | NOT NULL | |
| `bio` | `text` | NOT NULL | |
| `location` | `text` | NOT NULL | |
| `work_mode` | `text` | `CHECK ('remote' \| 'hybrid' \| 'on-site')` | |
| `skills` | `text` | NOT NULL, default `''` | Comma-separated |
| `tools` | `text` | NOT NULL, default `''` | Comma-separated |
| `content_types` | `text` | NOT NULL, default `''` | Comma-separated |
| `styles` | `text` | NOT NULL, default `''` | Comma-separated |
| `experience` | `text` | NOT NULL, default `''` | |
| `rates` | `text` | nullable | |
| `formats` | `text` | NOT NULL, default `''` | Comma-separated |
| `workflow` | `text` | NOT NULL, default `''` | |
| `verification_status` | `text` | `CHECK ('self-reported' \| 'not-verified')`, default `'self-reported'` | Flag only; no verification workflow exists |
| `availability` | `text` | `CHECK ('available' \| 'selective' \| 'unavailable')`, default `'available'` | |
| `published` | `boolean` | NOT NULL, default `false` | Controls public visibility |
| `created_at` / `updated_at` | `timestamptz` | auto-managed | |

**Indexes:**
- `creator_profiles_published_updated_idx` — partial index on `updated_at DESC` where `published = true`.

### `portfolio_projects`

Media items belonging to a creator profile.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `bigint` (PK) | identity | |
| `creator_id` | `bigint` | FK → `creator_profiles(id)` ON DELETE CASCADE | |
| `title` | `text` | NOT NULL | |
| `description` | `text` | NOT NULL, default `''` | |
| `content_type` | `text` | NOT NULL, default `''` | |
| `tools` | `text` | NOT NULL, default `''` | |
| `skills` | `text` | NOT NULL, default `''` | |
| `role` | `text` | NOT NULL, default `''` | |
| `challenge` | `text` | NOT NULL, default `''` | |
| `approach` | `text` | NOT NULL, default `''` | |
| `outcomes` | `text` | NOT NULL, default `''` | |
| `impact_summary` | `text` | NOT NULL, default `''` | |
| `media_path` | `text` | nullable, must be all-null or all-set with `media_name`/`media_type`/`media_size` | Storage object path |
| `media_name` | `text` | nullable | Original filename |
| `media_type` | `text` | `CHECK (NULL \| 'image/jpeg' \| 'image/png' \| 'image/webp' \| 'image/gif')` | |
| `media_size` | `integer` | `CHECK (NULL \| 1..8388608)` | Max 8 MB |
| `is_concept` | `boolean` | NOT NULL, default `false` | Marks speculative work |
| `published` | `boolean` | NOT NULL, default `false` | |
| `sort_order` | `integer` | NOT NULL, default `0`, `CHECK (≥ 0)` | |
| `created_at` / `updated_at` | `timestamptz` | auto-managed | |

**Indexes:**
- `portfolio_projects_creator_order_idx` — `(creator_id, sort_order, created_at DESC)`
- `portfolio_projects_public_idx` — partial on `(creator_id, sort_order)` where `published = true`

### `briefs`

Campaign briefs created by brand accounts.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `bigint` (PK) | identity | |
| `brand_id` | `uuid` | FK → `profiles(id)` ON DELETE CASCADE | |
| `title` | `text` | NOT NULL | |
| `objective` | `text` | NOT NULL | |
| `content_type` | `text` | NOT NULL | |
| `style` | `text` | NOT NULL | |
| `audience` | `text` | NOT NULL | |
| `platform` | `text` | NOT NULL | |
| `duration` | `text` | NOT NULL | |
| `aspect_ratio` | `text` | NOT NULL | |
| `deliverables` | `integer` | NOT NULL, `CHECK (> 0)` | |
| `budget` | `text` | NOT NULL | |
| `deadline` | `text` | NOT NULL | |
| `location` | `text` | NOT NULL | |
| `work_mode` | `text` | `CHECK ('remote' \| 'hybrid' \| 'on-site')` | |
| `licensing` | `text` | NOT NULL | Free-text; no enum validation |
| `status` | `text` | `CHECK ('draft' \| 'published' \| 'closed')`, default `'draft'` | |
| `created_at` / `updated_at` | `timestamptz` | auto-managed | |

**Status transitions** (enforced by trigger `briefs_valid_status_transition`):
- `draft → published` ✅
- `published → draft` ✅ (revert to draft)
- `published → closed` ✅
- `draft → closed` ❌
- `closed → *` ❌

### `saved_creators`

Brand shortlist — bookmarks a published creator.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `bigint` (PK) | identity |
| `brand_id` | `uuid` | FK → `profiles(id)` ON DELETE CASCADE |
| `creator_id` | `bigint` | FK → `creator_profiles(id)` ON DELETE CASCADE |
| `created_at` | `timestamptz` | default `now()` |

**Constraint:** `UNIQUE (brand_id, creator_id)`

### `collaboration_requests`

A brand sends a request to a creator, tied to a specific brief.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `bigint` (PK) | identity |
| `brief_id` | `bigint` | FK → `briefs(id)` ON DELETE CASCADE |
| `brand_id` | `uuid` | FK → `profiles(id)` ON DELETE CASCADE |
| `creator_id` | `bigint` | FK → `creator_profiles(id)` ON DELETE CASCADE |
| `message` | `text` | NOT NULL |
| `status` | `text` | `CHECK ('sent' \| 'accepted' \| 'declined')`, default `'sent'` |
| `created_at` / `updated_at` | `timestamptz` | auto-managed |

**Status transitions** (enforced by trigger `collaboration_valid_status_transition`):
- `sent → accepted` ✅
- `sent → declined` ✅
- Any other transition ❌

---

## Relationships

```
auth.users 1──1 profiles 1──1 creator_profiles 1──* portfolio_projects
                    │
                    ├──* briefs
                    ├──* saved_creators ──* creator_profiles
                    └──* collaboration_requests ──* briefs
                                               ──* creator_profiles
```

---

## Row Level Security (RLS)

All six tables have RLS enabled. Key policies:

| Table | Policy | Effect |
|-------|--------|--------|
| `profiles` | `profiles_select_own` | Authenticated users read their own profile |
| `profiles` | `profiles_select_collaboration_brand` | Creators can read brand profiles that have sent them collaboration requests |
| `profiles` | `profiles_update_own` | Users update only their own `account_type` and `display_name` |
| `creator_profiles` | `creator_profiles_read_public_or_own` | `anon` + `authenticated` see published profiles **or** their own |
| `creator_profiles` | `creator_profiles_insert_own` | Only creators (by `account_type`) can insert for themselves |
| `creator_profiles` | `creator_profiles_update_own` / `_delete_own` | Owner only |
| `portfolio_projects` | `portfolio_projects_read_published_or_own` | Public sees published projects of published creators; owners see all their own |
| `portfolio_projects` | `_insert_own` / `_update_own` / `_delete_own` | Owner only |
| `briefs` | `briefs_read_published_or_own` | `anon` + `authenticated` see published **or** brand's own |
| `briefs` | `briefs_insert_own_brand` / `_update_own_brand` / `_delete_own_brand` | Brand owner only |
| `saved_creators` | `saved_creators_read_own` | Brand reads own saves |
| `saved_creators` | `saved_creators_insert_own_published` | Brand saves only published creators |
| `saved_creators` | `saved_creators_delete_own` | Brand removes own saves |
| `collaboration_requests` | `collaboration_requests_read_participant` | Brand or targeted creator reads |
| `collaboration_requests` | `collaboration_requests_insert_eligible` | Brand inserts only for published briefs + published creators |
| `collaboration_requests` | `collaboration_requests_update_creator_response` | Creator can only change `status` from `sent` to `accepted`/`declined` |

**Column grants:** `profiles` update is restricted to `account_type` and `display_name` only. `collaboration_requests` update is restricted to `status` only.

---

## Triggers

| Trigger | Table | Purpose |
|---------|-------|---------|
| `*_set_updated_at` | All 6 tables | Auto-sets `updated_at` to `now()` before update |
| `on_auth_user_created` | `auth.users` | Inserts a `profiles` row (security definer) |
| `briefs_valid_status_transition` | `briefs` | Enforces status lifecycle |
| `collaboration_valid_status_transition` | `collaboration_requests` | Enforces status lifecycle |

---

## Storage

**Bucket:** `portfolio-media`
- Private bucket (not publicly readable)
- Max file size: 8 MB
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`

**Policies on `storage.objects`:**
| Policy | Access |
|--------|--------|
| `portfolio_media_read_owner_or_published` | Owner reads their own folder; anyone reads media for published projects of published creators |
| `portfolio_media_insert_owner` | Creator inserts into their own UUID folder |
| `portfolio_media_update_owner` | Creator updates within their own folder |
| `portfolio_media_delete_owner` | Creator deletes from their own folder |

**Path convention:** `{user_uuid}/...` — the first path segment is the user's UUID.

---

## RPC Functions

| Function | Arguments | Purpose |
|----------|-----------|---------|
| `reorder_portfolio_projects` | `project_ids bigint[]` | Atomically reorders all of the caller's portfolio projects. Validates ownership and completeness. |
