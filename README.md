# AgentGDD — Estúdio Profissional de Game Design Documents (GDD)

Plataforma full-stack para criação, auditoria de qualidade, versionamento e exportação de **Game Design Documents (GDD)** completos (12–15 seções) a partir de ideias livres ou templates de gênero, baseada no prompt [Prompt-Agente-GDD-IA](./Prompt-Agente-GDD-IA).

## Recursos Principais

- **Orquestração Multi-Estágio com Gemini AI (`@google/genai`)**: Geração em 4 estágios encadeados (`gemini-3.8-flash` / `gemini-4-argon`) com streaming SSE e persistência incremental no Supabase.
- **12 Seções Obrigatórias + 3 Módulos Studio**: Cobre desde Executive Summary, Specs Técnicas e Paleta HEX até Netcode/LiveOps (Seção 13), Acessibilidade & Inclusão (Seção 14) e Manifesto de Assets, Telemetria & Riscos (Seção 15).
- **Detector de Conflitos Técnicos**: Alerta incompatibilidades (ex.: escopo solo vs MMORPG AAA, Unreal Engine 5 vs WebGL/HTML5, câmera 2D vs primeira pessoa) antes da geração.
- **Auditoria Automática (15 Critérios)**: Calcula score de completude, valida códigos HEX, tabelas estruturadas, diagramas Mermaid e detecta termos vagos.
- **Tabelas Estruturadas & Paleta Visual**: Edição interativa de Inimigos, Bosses, Equipamentos, Skills, Roadmap, Assets e Riscos + swatches HEX com contraste WCAG.
- **Moodboard Visual & Exportação**: Geração de moodboard com `gemini-nano-banana-2.1`, snapshots de versão, link público somente leitura e exportação `.md`, `.json`, `.csv` (Backlog) e Print/PDF.

## Configuração Local

1. Copie `.env.example` para `.env.local` e preencha suas chaves do Supabase e `GEMINI_API_KEY`.
2. Instale dependências e o navegador Chromium do Playwright:
   ```bash
   pnpm install
   pnpm exec playwright install chromium
   ```
3. Execute as migrations diretamente no Supabase PostgreSQL:
   ```bash
   pnpm run db:migrate
   pnpm run db:verify
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   pnpm dev
   ```

## Testes com Playwright (Unitário, API & E2E)

```bash
pnpm run test:unit   # Testes unitários puros via Playwright Test
pnpm run test:api    # Testes de integração dos Route Handlers
pnpm run test:e2e    # Testes End-to-End no Chromium
pnpm test            # Suíte completa
```

## Documentação Contínua

- [Arquitetura](./docs/ARCHITECTURE.md)
- [Tutorial Completo & Guia das 15 Seções](./docs/TUTORIAL.md)
- [Banco de Dados & Migrations](./docs/DATABASE.md)
- [Referência de APIs](./docs/API.md)
- [Especificação Studio GDD](./docs/FEATURES/gdd-studio.md)
- [Layout Studio v2 & Wizard 3 Passos](./docs/FEATURES/layout-studio-v2.md)
- [Changelog](./docs/CHANGELOG.md)
- [Skill de Padrões de Engenharia](./.agents/skills/agentgdd-standards/SKILL.md)
