---
name: agentgdd-standards
description: >-
  Mandatory engineering workflow for the AgentGDD project. Use before and after
  inserting any feature or resource, modifying existing code, running database
  migrations, writing Playwright unit/API/E2E tests, or committing and pushing to GitHub.
---

# AgentGDD Engineering, Documentation & Playwright Testing Standards

Follow this workflow on **every** task that adds a feature/resource, modifies code, alters the database schema, or prepares a commit in `AgentGDD`.

---

## 1. Mandatory Documentation Rule (Every Change)

No feature insertion, resource addition, schema change, or code modification is complete until documentation is updated in the same change set:

1. **Always update `docs/CHANGELOG.md`** (use [doc-templates.md](./references/doc-templates.md)):
   - Record entries under `Added`, `Changed`, `Fixed`, `Database`, `Tests`, and `Docs` with the date and affected file paths.
2. **Update specialized living documentation when applicable**:
   - **New feature or major resource**: Create or update `docs/FEATURES/<feature-slug>.md` describing purpose, user flow, inputs/outputs, edge cases, and tests.
   - **Architecture, folder structure, or AI prompt/pipeline change**: Update `docs/ARCHITECTURE.md`.
   - **Supabase table, column, index, trigger, function, seed, or RLS change**: Update `docs/DATABASE.md`.
   - **API route, payload, or status code change**: Update `docs/API.md`.
3. **Code-level documentation**:
   - Add JSDoc/TSDoc docstrings to all newly exported functions, classes, types, components, and API handlers.
   - Preserve unrelated existing comments; comment the non-obvious *why*, not the obvious *what*.

---

## 2. Playwright Testing Rule (Unit + API + E2E)

All automated tests in AgentGDD run through **Playwright Test (`@playwright/test`)** so unit, API, and browser E2E suites share one unified runner and report (`npx playwright test`).

### Test Suites (`playwright.config.ts` projects)

| Project | Location | Purpose | Command |
| :--- | :--- | :--- | :--- |
| `unit` | `tests/unit/**/*.spec.ts` | Pure unit tests using `@playwright/test` (`test`, `expect`) for GDD domain logic: prompt builders, Markdown section parsers, 12-section completeness & consistency auditors, HEX palette extractors, export formatters, budget/scope helpers. | `npx playwright test --project=unit` |
| `api` | `tests/api/**/*.spec.ts` | API & Route Handler tests using Playwright `request` (`APIRequestContext`) against the app server: validation, error codes, DB persistence, mocked AI generation streams. | `npx playwright test --project=api` |
| `e2e` | `tests/e2e/**/*.spec.ts` | Browser tests in Chromium: concept wizard, GDD studio workspace, section editing, entity tables, color swatches, Mermaid diagrams, versioning, exports, and layout checks. | `npx playwright test --project=e2e` |

### Testing Requirements on Every Task

1. **New feature or resource**: Add corresponding Playwright **unit tests** (`tests/unit/<module>.spec.ts`) for all business logic, **API tests** (`tests/api/<endpoint>.spec.ts`) if endpoints were added/changed, and **E2E tests** (`tests/e2e/<flow>.spec.ts`) if UI behavior changed.
2. **Bug fix**: Add a regression test in Playwright (`tests/unit/` or `tests/e2e/`) reproducing the bug before/alongside the fix.
3. **Mocking external LLM calls in tests**: Keep unit and deterministic E2E tests fast and network-independent by mocking AI provider responses at the service/route boundary while testing real parsing, validation, and Supabase/app behavior.
4. **Full suite verification**: Run `npx playwright test` after the final edit and confirm 0 failures and no skipped/relaxed assertions before committing.

---

## 3. Database & Supabase Migration Workflow

1. Never hardcode credentials or commit `.env*` files. Read `DATABASE_URL` from `.env.local` (note: escape/preserve `$` characters carefully in shell scripts).
2. Write every schema or seed change as a numbered SQL file in `supabase/migrations/NNNN_<description>.sql`.
3. Execute migrations directly against Supabase via `npm run db:migrate` (tracked in `schema_migrations`).
4. Verify applied tables, constraints, indexes, and RLS policies directly against the database after running migrations.
5. Document every migration and schema object in `docs/DATABASE.md` and `docs/CHANGELOG.md`.

---

## 4. Pre-Commit & Git Push Gate

Before running `git commit` and `git push origin main`:

1. Run static checks: `npm run typecheck` and `npm run lint`.
2. Run Playwright test suites: `npx playwright test`.
3. Run production build check: `npm run build`.
4. Confirm `docs/CHANGELOG.md` and affected `docs/*.md` files reflect all changes made.
5. Run `git status` and `git diff --staged` to verify zero `.env*`, API keys, or DB passwords are staged.
6. Commit with Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`) and push to `https://github.com/JuanBMMontesinos/AgentGDD`.
