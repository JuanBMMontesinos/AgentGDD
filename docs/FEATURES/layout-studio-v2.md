# Feature: Studio Layout v2, 3-Step Creation Wizard & Interactive Tutorial

## Purpose
Reduces cognitive overload and clarifies the GDD creation and editing workflow by separating Project Management (`/`), Guided Creation (`/new`), 3-Zone Studio Editing (`/projects/[id]`), and Interactive Documentation (`/guide`).

## Files & Resources
- **Hub & Wizard**:
  - `src/app/page.tsx` + `src/components/ProjectsDashboardClient.tsx`: Clean project dashboard with search, delete confirmation `<dialog>`, and quick-start template links to `/new?template=<slug>`.
  - `src/app/new/page.tsx` + `src/components/NewGddWizard.tsx`: Dedicated 3-step progressive-disclosure Wizard (`1. Ideia & Template` → `2. Arquitetura & Escopo` → `3. Formato & Geração`).
- **3-Zone Studio Workspace**:
  - `src/components/GddStudioWorkspace.tsx`: Uncluttered toolbar with `Exportar` & `Compartilhar` disclosure panels, discipline-grouped section sidebar (`A`–`D`) separated from global project tools (`Tabelas`, `Moodboard`, `Versões`), contextual per-section help banner, and a retractable Right Copilot & Notes drawer closed by default.
- **Interactive Tutorial & Metadata**:
  - `src/lib/gdd/sections.ts`: Enriched with `groupId`, `summary`, `whyItMatters`, `specialToolHint`, `exampleRefinePrompts`, and `getSectionGroups()`.
  - `src/app/guide/page.tsx` & `docs/TUTORIAL.md`: Dedicated tutorial page linked from Navbar (`Tutorial & Seções`).

## Verification (Playwright)
- Unit tests: `tests/unit/sections-metadata.spec.ts`
- E2E tests: `tests/e2e/gdd-studio.spec.ts` (covers `/guide`, `/new` 3-step flow, grouped Studio sidebar, closed-by-default Copilot drawer, Export disclosure + Escape dismiss, Audit dialog, Tables, and Public Share).
