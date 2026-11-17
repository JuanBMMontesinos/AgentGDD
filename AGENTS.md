# AgentGDD Project Instructions

- Mandatory workflow: Follow the `agentgdd-standards` skill (`.agents/skills/agentgdd-standards/SKILL.md`) before and after every feature insertion, resource addition, schema migration, or code change.
- Every change MUST update `docs/CHANGELOG.md` and the corresponding `docs/*.md` documentation.
- Every feature and bugfix MUST include Playwright tests (`tests/unit/`, `tests/api/`, `tests/e2e/`) verified with `npx playwright test`.
- NEVER commit `.env.local` or any API keys / database credentials to Git.
