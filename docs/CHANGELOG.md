# Changelog

All notable changes, resource insertions, database migrations, documentation updates, and test additions for **AgentGDD** are documented in this file.

## [Unreleased] - 2026-11-16

### Added
- **Engineering Skill (`.agents/skills/agentgdd-standards/SKILL.md`)**: Memorizes mandatory documentation updates, direct Supabase migration rules, Playwright unit/API/E2E test requirements, and Git pre-commit checks.
- **Project Bootstrap (`package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `playwright.config.ts`)**: Configured Next.js App Router, React 19, TypeScript strict, Tailwind CSS v4, `@google/genai`, `@supabase/ssr`, `pg`, and Playwright (`unit`, `api`, `e2e` projects).
- **Environment & Security Templates (`.gitignore`, `.env.example`, `AGENTS.md`)**: Excluded `.env*` secrets from Git and added safe environment variable documentation.
- **GDD Domain Engine (`src/lib/gdd/*`, `src/types/gdd.ts`)**: Implemented 12+3 section definitions, technical/scope conflict detector, 4-stage prompt builder, Markdown/table/HEX parser, 15-point quality auditor, `.md`/`.json`/`.csv` exporters, and deterministic test fixtures.
- **Gemini AI Orchestrator (`src/lib/ai/gemini.ts`)**: Integrated `@google/genai` streaming `interactions.create()` chaining, section refinement, and `gemini-nano-banana-2.1` concept-art moodboard generation.
- **Supabase Auth & API Routes (`src/lib/supabase/*`, `src/middleware.ts`, `src/app/api/**`)**: Enforced mandatory Supabase Auth + RLS across projects, sections, entities, SSE generation, audits, snapshots, comments, moodboard, exports, and public sharing.
- **Studio UI (`src/app/**`, `src/components/**`)**: Built accessible light/dark-aware Studio UI with Guided Wizard, Section Navigator, live Mermaid & HEX palette viewer, structured Entity Tables, native `<dialog>` Audit Report, AI Section Copilot, Version Snapshots, and Print/PDF styles.

### Database
- **Migration `0001_initial_schema.sql`**: Created core tables (`gdd_templates`, `gdd_projects`, `gdd_sections`, `gdd_entities`, `gdd_versions`, `gdd_audit_reports`, `gdd_comments`, `gdd_generation_jobs`, `schema_migrations`).
- **Migration `0002_indexes_triggers_rls.sql`**: Added `updated_at` triggers, GIN/BTREE indexes, and strict Supabase RLS policies.
- **Migration `0003_seed_templates.sql`**: Seeded 11 starter genre templates mapped to `Prompt-Agente-GDD-IA`.
- **Migration Runner (`scripts/migrate.mjs`, `scripts/verify-db.mjs`)**: Direct PostgreSQL migration runner and schema verifier.

### Changed
- **Gemini AI Resilience (`src/lib/ai/gemini.ts`)**: Added `isTransientGeminiError` and `withModelFallback` automatic retry/fallback chain (`gemini-4-argon` -> `gemini-3.8-flash` -> `gemini-3.5-flash-lite`) to handle transient `503`/`429` high-demand spikes cleanly.
- **Auth Hydration & Audit UX (`src/app/login/page.tsx`, `src/components/GddStudioWorkspace.tsx`)**: Added client hydration flag (`data-hydrated`) and full navigation after sign-in (`window.location.assign('/')`) to guarantee fresh SSR session cookies; streamlined `handleRunAudit()` to update audit state directly from `POST /api/projects/[id]/audit` with loading indicator.
- **Playwright Runner Stability (`playwright.config.ts`, `tests/helpers/supabase-test-user.ts`, `tests/e2e/gdd-studio.spec.ts`)**: Configured production server mode (`next start`) when `.next/BUILD_ID` exists and added Chromium launch flags for clean Windows teardown (`--disable-gpu`, `--no-sandbox`, `--remote-debugging-port=0`).

### Tests
- **Playwright Full Suite (`tests/unit/*.spec.ts`, `tests/api/gdd-api.spec.ts`, `tests/e2e/gdd-studio.spec.ts`)**: Added unit tests (including `gemini-resilience.spec.ts`), authenticated API lifecycle tests, and Chromium E2E tests verified via `npx playwright test`.

### Docs
- Created `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API.md`, `docs/CHANGELOG.md`, and `docs/FEATURES/gdd-studio.md`.
