# AgentGDD — API Reference

All protected endpoints require an authenticated Supabase session cookie (enforced via `createServerSupabaseClient()` and Supabase RLS), except `/api/health`, `/api/templates`, and public share reads `/api/share/[slug]`.

## Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check returning app status and database connectivity check. |
| `GET` | `/api/templates` | Lists all seeded genre GDD templates (`gdd_templates`). |
| `GET` | `/api/projects` | Lists projects owned by the authenticated user. |
| `POST` | `/api/projects` | Creates a new GDD project, runs conflict pre-check, initializes sections, and persists to Supabase. |
| `GET` | `/api/projects/[id]` | Fetches project metadata, sections, structured entities, versions, latest audit, and comments. |
| `PATCH` | `/api/projects/[id]` | Updates project metadata (`title`, `status`, `version_label`, `is_public`, `share_slug`, `concept_brief`). |
| `DELETE` | `/api/projects/[id]` | Deletes a project and cascades child rows. |
| `POST` | `/api/projects/[id]/generate` | Streams (SSE) multi-stage GDD generation using `@google/genai` (or deterministic mock when `E2E_MOCK_AI=1` in test mode), emitting `stage_start`, `stage_status`, `stage_heartbeat`, `text_delta`, `stage_saved`, `cancelled`, `error`, and `done`. Accepts `{ resumeOnlyMissing: true }` to skip already-completed stages. |
| `POST` | `/api/projects/[id]/generate/cancel` | Marks active `queued`/`running` generation jobs as `cancelled`, preserves all completed sections, and returns the updated partial `overallScore`. |
| `PATCH` | `/api/projects/[id]/sections/[sectionNumber]` | Updates a section's Markdown content or `review_status` and recalculates `word_count` and audit score. |
| `POST` | `/api/projects/[id]/sections/[sectionNumber]/refine` | Refines or expands a single section via Gemini AI using cross-section context. |
| `POST` | `/api/projects/[id]/entities` | Adds or replaces structured entities (`enemy`, `boss`, `equipment`, `skill`, `color_swatch`, `roadmap_phase`, `risk_item`, `asset_estimate`). |
| `DELETE` | `/api/projects/[id]/entities/[entityId]` | Removes a structured entity row. |
| `POST` | `/api/projects/[id]/audit` | Runs the automated 12+ point GDD Quality & Consistency Auditor and stores a `gdd_audit_reports` record. |
| `POST` | `/api/projects/[id]/versions` | Creates an immutable version snapshot (`gdd_versions`) of current sections & entities. |
| `POST` | `/api/projects/[id]/versions/[versionId]/restore` | Restores a project's sections/entities from a stored snapshot. |
| `POST` | `/api/projects/[id]/comments` | Creates a review comment on a section (`resolved` toggling via `PATCH`). |
| `POST` | `/api/projects/[id]/moodboard` | Generates an optional concept art moodboard image via Gemini Nano Banana (`gemini-nano-banana-2.1`) from Section 4 palette & art direction. |
| `GET` | `/api/projects/[id]/export?format=md\|json\|csv` | Downloads consolidated Markdown, structured JSON, or Jira/Linear-ready Roadmap CSV backlog. |
| `GET` | `/api/share/[slug]` | Fetches a read-only public GDD when `is_public = true`. |
