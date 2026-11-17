# Documentation Templates for AgentGDD

## `docs/CHANGELOG.md` Entry Format

```markdown
## [Unreleased] - YYYY-MM-DD

### Added
- **Feature/Resource Name** (`path/to/file.ts`): Short description of what was added and why.

### Changed
- **Module Name** (`path/to/file.ts`): Summary of behavioral or structural modification.

### Database
- **Migration `NNNN_name.sql`**: Tables, columns, indexes, or RLS policies added/updated.

### Tests
- **Playwright (`tests/unit/...`, `tests/e2e/...`)**: Coverage added and verified via `npx playwright test`.

### Docs
- Updated `docs/FEATURES/...`, `docs/DATABASE.md`, `docs/API.md`, `docs/ARCHITECTURE.md`.
```

## `docs/FEATURES/<feature-slug>.md` Format

```markdown
# Feature: <Title>

## Purpose
Why this feature exists and which GDD / user problem it solves.

## Files & Resources
- UI: `src/...`
- API: `src/app/api/...`
- Domain Logic: `src/lib/...`
- Database: `supabase/migrations/...`

## Behavior & Edge Cases
- Primary flow
- Validation rules and error states

## Verification (Playwright)
- Unit tests: `tests/unit/<slug>.spec.ts`
- API tests: `tests/api/<slug>.spec.ts`
- E2E tests: `tests/e2e/<slug>.spec.ts`
```
