# Tutorial Completo do AgentGDD — Do Conceito à Bíblia do Jogo

Este guia explica **como operar o AgentGDD passo a passo** e **o que deve conter cada uma das 15 seções** do Game Design Document (GDD).

---

## Parte 1 — Visão Geral: Como o Fluxo Funciona

1. **Autenticação (`/login`):** Cada projeto pertence à sua conta com isolamento por banco (RLS no Supabase).
2. **Dashboard Limpo (`/`):** Liste, busque e gerencie seus projetos GDD ou clique em **+ Criar Novo GDD**.
3. **Wizard em 3 Passos (`/new`):**
   - *Passo 1 — Ideia & Template*: escolha um dos 11 gêneros ou escreva sua ideia livre.
   - *Passo 2 — Arquitetura & Escopo*: defina Engine, Câmera, Plataformas e Equipe com **Detector de Conflitos Técnicos** em tempo real.
   - *Passo 3 — Formato & Geração*: escolha Modo (`Bíblia Completa` vs `MVP Enxuto`), Idioma e Multiplayer.
4. **Studio 3 Colunas (`/projects/[id]`):**
   - *Esquerda*: Navegador agrupado por disciplinas (Blocos A–D) com indicadores de status (`vazio`, `rascunho`, `aprovado`) e **liberação progressiva**: durante a geração por IA, apenas seções já concluídas ficam desbloqueadas para leitura (as demais permanecem travadas com cadeado para evitar edições conflitantes; fora da geração, o botão **Editar vazias** permite escrita manual opt-in). Inclui Ferramentas Globais (*Tabelas*, *Moodboard*, *Auditoria*, *Versões*).
   - *Painel de Geração Ao Vivo & Cancelamento*: Enquanto a IA trabalha, o centro exibe progresso percentual, tempo decorrido, checklist dos 4 estágios, preview em streaming e o botão **Cancelar e Manter Seções Concluídas**. Se cancelar no meio, tudo o que já foi salvo permanece intacto e você pode clicar em **Continuar Geração** para retomar apenas os estágios faltantes.
   - *Centro*: Dica contextual da seção + leitura formatada (Markdown + Mermaid + Paleta HEX) e edição.
   - *Direita (Retrátil)*: Copiloto de Refinamento IA e Notas da equipe (fechado por padrão para focar na leitura).
5. **Versionamento & Exportação:** Salve snapshots (`v1.0`, `v1.1`), gere link público (`/share/...`) ou exporte em `.MD`, `.JSON`, `.CSV Backlog` e `PDF / Imprimir`.

---

## Parte 2 — Papel de Cada Seção (1 a 15)

- **Bloco A — Conceito & Direção (1–4):**
  1. *Informações do Documento*: Título, versão, data, status e estúdio.
  2. *Visão Geral (Executive Summary)*: Conceito, pitch, gênero, público-alvo, plataformas e USP.
  3. *Especificações Técnicas*: Engine versionada, linguagem, dimensionalidade, câmera, resolução e FPS.
  4. *Estilo Visual & Direção de Arte*: Estilo artístico, tabela HEX (`#RRGGBB` -> **Paleta Visual** + **Moodboard**), assets e comparativo.
- **Bloco B — Narrativa & Gameplay (5–6):**
  5. *Narrativa & História*: Premissa, protagonista, personagens secundários, atos e temas.
  6. *Mecânicas de Gameplay*: Controles, 3–5 mecânicas principais, progressão e **Core Loop (Mermaid)**.
- **Bloco C — Sistemas, Mundo & Desafios (7–9):**
  7. *Sistemas de Jogo*: Combate, inventário, **Equipamentos**, **Skills**, economia, save e áudio adaptativo.
  8. *Mundo & Level Design*: Biomas, regiões, loops de fase e NPCs.
  9. *Inimigos & Desafios*: **Tabela de Inimigos**, **Bosses**, máquina de estados de IA e obstáculos.
- **Bloco D — UI, Produção & Módulos Studio (10–15):**
  10. *UI/UX*: Menu principal, HUD, menus secundários, wireframes e responsividade.
  11. *Roadmap de Desenvolvimento*: MVP vs Full Version, fases, equipe, orçamento -> **CSV Backlog**.
  12. *Referências & Inspirações*: Jogos similares, referências artísticas e docs extras.
  13. *Multiplayer, Netcode & LiveOps (opcional)*: Topologia de rede, tickrate, matchmaking e anti-cheat.
  14. *Acessibilidade & Inclusão*: Daltonismo, legendas, remapeamento e conforto cognitivo.
  15. *Manifesto de Assets, Telemetria & Riscos*: Contagem de assets, KPIs e mitigação de riscos -> **CSV Backlog**.
