# Feature: Usability v3 — Wizard Submit Lock, Live SSE Progress, Progressive Locking & Safe Cancellation

## Purpose
Eliminates double-submissions on project creation (`/new`), provides real-time feedback and conflict-free UI locking during multi-stage AI generation (`/projects/[id]`), progressively unlocks completed GDD sections as each stage finishes, and supports safe mid-stream cancellation with partial progress preservation and resume.

## Key Changes

1. **Double-Submit Protection & Route Prefetch (`src/components/NewGddWizard.tsx`)**
   - Prefetches the Studio route template (`/projects/00000000-0000-0000-0000-000000000000`) when entering Step 3.
   - Keeps `submitting = true` permanently after `POST /api/projects` succeeds until Next.js navigation unmounts the Wizard (resetting only on network/HTTP error), preventing multiple clicks while transitioning.
   - Disables the `Voltar` button alongside the submit button (`Criando e abrindo Studio GDD...`) and switches from `router.push` + `router.refresh()` to `router.replace(targetUrl)`.

2. **Live Generation Panel & Rich SSE Telemetry (`src/components/GddStudioWorkspace.tsx`, `src/lib/ai/gemini.ts`, `src/app/api/projects/[id]/generate/route.ts`)**
   - Added a dedicated `'generating'` main view featuring semantic `<progress aria-label="Progresso da geração do GDD">`, live elapsed timer (`elapsedSeconds`), 4-stage checklist (`check` / `spinner` / `lock`), and live Markdown output preview.
   - Emits `stage_status` (from `@google/genai` `step.start` thought/text events and `withModelFallback` notifications) and 2.5s `stage_heartbeat` events over SSE so the interface remains responsive during long model responses.

3. **Progressive Section Unlocking & Conflict Prevention (`src/components/GddStudioWorkspace.tsx`)**
   - While generation is active (`isGenerating`), empty/pending sidebar sections are disabled (`disabled`, `Lock` icon) and unlock immediately when their stage completes (`stage_saved` + `refreshProject()`).
   - Conflicting top-bar and global actions (`Auditar Qualidade`, `Exportar`, `Compartilhar`, `Copiloto & Notas`, `Tabelas`, `Moodboard Visual`, `Versões`, and section editors) are disabled while `isGenerating` is true.
   - Outside generation, unfilled sections stay locked by default to prevent accidental empty reads, with an explicit `"Editar vazias"` / `"Travar vazias"` sidebar toggle and per-section `"Escrever Manualmente"` opt-in.

4. **Safe Cancellation & Partial Resume (`src/app/api/projects/[id]/generate/cancel/route.ts`, `src/lib/gdd/prompt-builder.ts`, `supabase/migrations/0004_job_cancelled_status.sql`)**
   - Migration `0004` adds `'cancelled'` to `gdd_generation_jobs_status_check`.
   - Clicking **Cancelar e Manter Seções Concluídas** / **Cancelar Geração** aborts the client fetch stream (`AbortController`) and invokes `POST /api/projects/[id]/generate/cancel`, preserving already-persisted sections and recalculating entities and audit score.
   - `getPendingStages(stages, filledSectionNumbers)` filters out already-completed stages so clicking **Continuar Geração (N estágios)** sends `{ resumeOnlyMissing: true }` to `POST /api/projects/[id]/generate` and resumes only the remaining stages.

## Verification
- Unit tests in `tests/unit/prompt-builder.spec.ts` validate `getPendingStages` and `getStageForSection`.
- API tests in `tests/api/gdd-api.spec.ts` verify `POST /api/projects/[id]/generate/cancel`, `resumeOnlyMissing: true` partial completion, and `400` rejection when all sections are already filled.
- E2E test in `tests/e2e/gdd-studio.spec.ts` asserts Wizard button lock, live `<progress>` panel, disabled conflicting controls, Stage 1 progressive unlock before Stage 2 finishes, mid-stream cancellation, partial read verification, and resume to completion.
