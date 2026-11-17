# AgentGDD — Database Documentation

## Target Database
- **Provider:** Supabase PostgreSQL (`project_ref: fenomhkcqhrcypcpphnx`)
- **Direct Migration Runner:** `npm run db:migrate` (`scripts/migrate.mjs`)
- **Verification Script:** `npm run db:verify` (`scripts/verify-db.mjs`)

## Applied Migrations

| Version | File | Summary |
| :--- | :--- | :--- |
| `0001` | `supabase/migrations/0001_initial_schema.sql` | Creates `schema_migrations`, `gdd_templates`, `gdd_projects`, `gdd_sections`, `gdd_entities`, `gdd_versions`, `gdd_audit_reports`, `gdd_comments`, and `gdd_generation_jobs`. |
| `0002` | `supabase/migrations/0002_indexes_triggers_rls.sql` | Adds `set_updated_at()` triggers, performance/GIN indexes, enables RLS on all public tables, and enforces `auth.uid() = owner_id` / `is_public = true` policies. |
| `0003` | `supabase/migrations/0003_seed_templates.sql` | Seeds 11 genre starter templates covering all genres from `Prompt-Agente-GDD-IA`. |
| `0004` | `supabase/migrations/0004_job_cancelled_status.sql` | Adds `'cancelled'` to `gdd_generation_jobs_status_check` to track user-cancelled AI runs safely while keeping partial sections. |

## Tables & Security Model (RLS)

| Table | Purpose | RLS Access Rule |
| :--- | :--- | :--- |
| `schema_migrations` | Tracks applied SQL migrations | RLS enabled, no public policies (direct `postgres` runner only). |
| `gdd_templates` | Starter genre presets & briefs | Public read (`SELECT`), admin/migration write only. |
| `gdd_projects` | Core GDD metadata, brief, score, public share slug | Owner full CRUD (`auth.uid() = owner_id`); public read when `is_public = true`. |
| `gdd_sections` | Ordered GDD sections (1..15) in Markdown & JSONB | Inherited from parent `gdd_projects` ownership or `is_public = true`. |
| `gdd_entities` | Structured entities (`enemy`, `boss`, `equipment`, `skill`, `color_swatch`, `roadmap_phase`, `risk_item`, `asset_estimate`) | Inherited from parent `gdd_projects`. |
| `gdd_versions` | Immutable project snapshots (`v1.0`, `v1.1`, ...) | Inherited from parent `gdd_projects`. |
| `gdd_audit_reports` | Automated 12+ point checklist & conflict detection scores | Inherited from parent `gdd_projects`. |
| `gdd_comments` | Section-level team review notes | Inherited from parent `gdd_projects`. |
| `gdd_generation_jobs` | Multi-stage AI generation progress tracking | Owner only. |
