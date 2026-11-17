# Feature: AgentGDD Studio Workspace, AI Orchestration & Quality Auditor

## Purpose
Provides an interactive Studio workspace that converts game ideas into 12–15 section Game Design Documents aligned with [Prompt-Agente-GDD-IA](../../Prompt-Agente-GDD-IA), adding multi-stage Gemini streaming, real-time technical conflict detection, HEX palette visualization, Mermaid gameplay loop diagrams, structured entity tables, version snapshots, quality auditing, moodboard generation, and multi-format exports.

## Files & Resources
- **Domain Engine (`src/lib/gdd/`)**:
  - `sections.ts` — Canonical 12 mandatory + 3 studio extension section blueprints (`pt-BR`, `en-US`, `es`)
  - `conflict-detector.ts` — Pre-generation engine/platform/scope/camera incompatibility checks
  - `prompt-builder.ts` — 4-stage prompt orchestration + single-section refinement prompt builder
  - `parser.ts` — Numbered Markdown section parser, pipe table parser, HEX swatch & entity extractor, WCAG contrast calculator
  - `auditor.ts` — Automated 15-point checklist scorer & vague-quantifier detector
  - `exporters.ts` — `.md`, `.json`, and RFC 4180 backlog `.csv` exporters
  - `mock-generator.ts` — Deterministic 15-section fixture generator for Playwright tests
- **AI Integration (`src/lib/ai/gemini.ts`)**:
  - Uses `@google/genai` `interactions.create()` with `previous_interaction_id` chaining (`gemini-3.8-flash` / `gemini-4-argon`) and `gemini-nano-banana-2.1` for concept-art moodboards.
- **API Routes (`src/app/api/**`)**:
  - Full authenticated CRUD, SSE generation streaming, section refinement, entity tables, audit, snapshots/restore, comments, moodboard, exports, and public sharing.
- **UI Components (`src/components/**` & `src/app/**`)**:
  - `NewGddWizard`, `GddStudioWorkspace`, `MarkdownRenderer`, `ColorPalettePanel`, `EntityTableEditor`, `AuditChecklistDialog`, `Navbar`, `ThemeToggle`, `/login`, `/projects/[id]`, `/share/[slug]`.

## Verification (Playwright)
- Unit tests: `tests/unit/conflict-detector.spec.ts`, `tests/unit/parser.spec.ts`, `tests/unit/auditor.spec.ts`, `tests/unit/exporters.spec.ts`, `tests/unit/prompt-builder.spec.ts`
- API tests: `tests/api/gdd-api.spec.ts`
- E2E tests: `tests/e2e/gdd-studio.spec.ts`
