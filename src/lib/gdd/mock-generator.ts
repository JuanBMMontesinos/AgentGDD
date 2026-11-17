import { detectTechnicalConflicts } from '@/lib/gdd/conflict-detector';
import type { ConceptBrief } from '@/types/gdd';

/**
 * Generates deterministic, production-structured GDD Markdown for a given stage (1..4).
 * Used in automated Playwright tests (`E2E_MOCK_AI=1` / `x-mock-ai: 1`) so tests validate
 * real parsing, entity extraction, quality auditing, and Supabase persistence cleanly.
 */
export function generateMockStageMarkdown(brief: ConceptBrief, stageNumber: number): string {
  const title = brief.title || 'Projeto Sem Título';
  const studio = brief.studioName || 'Estúdio Independente';
  const engine = brief.engine || 'Unity 2022 LTS+';
  const dim = brief.dimensionality || '3D';
  const camera = brief.camera || 'Terceira Pessoa';
  const platforms = brief.platforms?.length ? brief.platforms.join(', ') : 'PC (Windows/Linux)';
  const today = new Date().toISOString().slice(0, 10);
  const conflicts = detectTechnicalConflicts(brief);

  if (stageNumber === 1) {
    const warningsMd =
      conflicts.length > 0
        ? conflicts.map((c) => `- **${c.title}:** ${c.suggestion}`).join('\n')
        : '- Nenhum conflito técnico crítico detectado para o escopo selecionado.';

    return [
      `# 1. Informações do Documento`,
      `- **Título do Jogo:** ${title}`,
      `- **Versão do GDD:** v1.0`,
      `- **Data de Criação:** ${today}`,
      `- **Status:** Pré-Produção`,
      `- **Desenvolvedoras/Estúdio:** ${studio}`,
      ``,
      `# 2. Visão Geral do Projeto (Executive Summary)`,
      `- **Conceito Principal:** ${brief.idea} O jogador assume papel ativo em missões táticas de alta intensidade com progressão clara de risco e recompensa.`,
      `- **Descrição Executiva:** ${title} é uma experiência de ${brief.genrePrimary ?? 'Ação'} (${brief.genreSecondary ?? 'Tático'}) desenhada para entregar partidas memoráveis de 15-25 minutos com forte leitura espacial e progressão sistêmica.`,
      `- **Gênero Primário e Secundário:** ${brief.genrePrimary ?? 'Ação'} / ${brief.genreSecondary ?? 'Aventura'}`,
      `- **Público-Alvo:** ${brief.targetAudience ?? 'Jogadores de 16-35 anos apreciadores de combate responsivo e progressão estratégica.'}`,
      `- **Plataformas Alvo:** ${platforms}`,
      `- **USP - Proposta Única de Venda:** Combinação de mecânicas responsivas de movimento com sistemas emergentes adaptados à equipe ${brief.teamSize ?? 'Indie'}.`,
      ``,
      `# 3. Especificações Técnicas`,
      `- **Engine Recomendada:** ${engine}`,
      `- **Linguagem de Programação:** ${engine.toLowerCase().includes('unreal') ? 'C++ & Blueprints' : engine.toLowerCase().includes('godot') ? 'GDScript & C#' : 'C#'}`,
      `- **Dimensionalidade:** ${dim}`,
      `- **Perspectiva de Câmera:** ${camera}`,
      `- **Resolução Alvo:** 1920x1080 (nativo) com suporte a 2560x1440 e escala dinâmica`,
      `- **Framerate Objetivo:** 60 FPS estáveis em configurações recomendadas`,
      `- **Plataformas e Requerimentos Mínimos:** ${platforms} (CPU Quad-Core, 8 GB RAM, GPU DX12/Vulkan 4 GB VRAM)`,
      ``,
      `### Alertas & Mitigações Técnicas`,
      warningsMd,
      ``,
      `# 4. Estilo Visual & Direção de Arte`,
      `- **Estilo Artístico:** Estilizado moderno com silhuetas de alto contraste e iluminação volumétrica controlada.`,
      `- **Justificativa do Estilo:** Mantém legibilidade imediata em combate acelerado e reduz custo de produção em 35% frente ao fotorrealismo.`,
      ``,
      `### Paleta de Cores Principal`,
      `| Elemento | Cor | Uso |`,
      `|----------|-----|-----|`,
      `| Primária | #0EA5E9 | HUD tático, energia do jogador e sinais interativos |`,
      `| Secundária | #F43F5E | Telegrafia de ataques inimigos e alertas críticos |`,
      `| Base Ambiente | #0F172A | Fundos arquitetônicos para alto contraste de silhuetas |`,
      `| Acento Loot | #F59E0B | Recompensas raras, objetivos primários e checkpoints |`,
      `| Suporte Neutro | #E2E8F0 | Tipografia principal de leitura e ícones de interface |`,
      ``,
      `- **Inspirações Visuais:** ${brief.inspirations ?? 'Hades, Ghostrunner, Signalis'}`,
      `- **Especificações de Resolução de Assets:** Texturas 1024x1024 (props), 2048x2048 (protagonista e chefes), UI vetorial SVG/SDF.`,
      ``,
      `### Análise Comparativa`,
      `| Referência | Ponto Forte | Diferencial de ${title} |`,
      `|---|---|---|`,
      `| Referência A | Ritmo de combate fluido | Maior sinergia entre ambiente e habilidades |`,
      `| Referência B | Direção de arte marcante | Escopo enxuto focado em rejogabilidade |`,
    ].join('\n');
  }

  if (stageNumber === 2) {
    return [
      `# 5. Narrativa & História`,
      `- **Premissa/Sinopse:** Em um mundo em transição tecnológica e conflito de recursos, facções rivais disputam o controle de núcleos energéticos antigos que alteram a realidade local.`,
      `- **Protagonista:** **Kael Vance**, especialista ágil motivado por resgatar sua equipe desaparecida e impedir o colapso do setor central.`,
      `- **Personagens Secundários:** **Dra. Lyra** (engenheira de suporte tático via rádio) e **Comandante Thorne** (antagonista pragmático).`,
      `- **Estrutura Narrativa:** 3 Atos claros divididos em 9 capítulos principais e 3 finais alternativos baseados em escolhas táticas.`,
      `- **Temas Principais:** Sacrifício vs. preservação, custo da ambição tecnológica e confiança sob pressão.`,
      `- **Tom/Atmosfera:** Tenso, cinematográfico e focado em ritmo ágil sem interromper o controle do jogador.`,
      ``,
      `# 6. Mecânicas de Gameplay`,
      `- **Controles Base:** Teclado/Mouse (WASD movimentação, Espaço salto/dash, Botão Esquerdo ataque/ação primária, Direito bloqueio/mira) e Gamepad completo com remapeamento total.`,
      `- **Mecânicas Principais:**`,
      `  1. **Movimento Cinético Encadeado:** Corrida com dash direcional de 0.35s de invulnerabilidade e custo de 1 carga de energia.`,
      `  2. **Combate/Interação Tática de Precisão:** Sistema de janela de contra-ataque (180ms) que recompensa risco calculado com multiplicador 1.5x.`,
      `  3. **Manipulação Ambiental:** Ativação de condutores e coberturas destrutíveis que alteram rotas em tempo real.`,
      `- **Mecânicas Secundárias:** Crafting de campo com 3 módulos combináveis e scanner de fraquezas com cooldown de 6s.`,
      `- **Sistema de Progressão:** Desbloqueio gradual de 12 habilidades distribuídas em 3 árvores de especialização.`,
      `- **Dificuldade & Balanceamento:** 3 modos (História, Padrão, Veterano) mais modificadores opcionais pós-campanha.`,
      ``,
      `### Fluxo de Jogo (Core Gameplay Loop)`,
      '```mermaid',
      'flowchart LR',
      '    A["Explorar Setor"] --> B["Enfrentar Desafios e Inimigos"]',
      '    B --> C["Coletar Recursos e Núcleos"]',
      '    C --> D["Aprimorar Equipamentos e Skills"]',
      '    D --> A',
      '```',
    ].join('\n');
  }

  if (stageNumber === 3) {
    return [
      `# 7. Sistemas de Jogo`,
      `- **Sistema de Combate:** Baseado em leitura de telegrafia visual/sonora (0.4s antes do impacto), gestão de vigor e combos de 3 etapas.`,
      `- **Sistema de Inventário & Equipamento:** Grade tática de 16 slots com 4 raridades (Comum, Incomum, Rara, Épica).`,
      ``,
      `| Nome | Tipo | Stats | Efeito Especial | Raridade |`,
      `|------|------|-------|-----------------|----------|`,
      `| Lâmina Voltaica | Arma | +18 ATK | Aplica choque por 2s em acertos críticos | Rara |`,
      `| Manto Cinético | Armadura | +25 DEF | Reduz cooldown de dash em 15% | Incomum |`,
      `| Núcleo Prisma | Módulo | +12 Energia | Regenera 3% de vida ao derrotar elites | Épica |`,
      ``,
      `- **Sistema de Progressão & Leveling:** Níveis 1–30 com curva exponencial suave e pontos de maestria dedicados.`,
      ``,
      `| Nome | Tipo | Custo | Efeito | Cooldown |`,
      `|------|------|-------|--------|----------|`,
      `| Pulso Disruptor | Ativa | 20 Energia | Atordoa inimigos em cone de 6m por 1.5s | 8s |`,
      `| Passo Fantasma | Ativa | 15 Energia | Atravessa projéteis deixando isca holográfica | 6s |`,
      `| Sinergia Tática | Passiva | 0 | Aumenta dano em 12% após contra-ataque | 0s |`,
      ``,
      `- **Sistema de Economia:** Duas moedas principais (Créditos para consumíveis e Fragmentos Raros para upgrades permanentes), equilibradas entre fontes de missão e sumidouros de forja.`,
      `- **Sistema de Salvar/Carregar:** Auto-save assíncrono em checkpoints a cada sala superada + 3 slots manuais.`,
      `- **Sistema de UI/Menu:** Navegação hierárquica rasa (máximo 2 cliques até ação principal) com suporte total a gamepad.`,
      `- **Sistema de Áudio & Música Adaptativa:** Trilha em camadas verticais (Exploração -> Alerta -> Combate -> Boss) via FMOD/Wwise com SFX espaciais 3D.`,
      ``,
      `# 8. Mundo do Jogo & Level Design`,
      `- **Descrição do Mundo:** Complexo modular dividido em biomas distintos com identidade visual e perigos próprios.`,
      `- **Regiões/Níveis Principais:** 4 regiões principais (Zona Periférica, Distritos Industriais, Arquivo Subterrâneo e Cidadela Central), totalizando 12 fases interconectadas.`,
      `- **Detalhes de Level Design:** Cada fase segue o padrão entrada segura -> 2 arenas de combate/puzzle -> atalho desbloqueável -> encontro de clímax.`,
      `- **Estrutura de Progressão:** Ordem semi-linear (Região 1 obrigatória; Regiões 2 e 3 em ordem livre; Região 4 após 2 chaves de núcleo).`,
      `- **NPCs & Interações:** 5 NPCs principais em hub central com diálogos ramificados e missões secundárias.`,
      ``,
      `# 9. Design de Inimigos & Desafios`,
      `| Nome | Tipo | Vida | Dano | Comportamento | Loot |`,
      `|------|------|------|------|---------------|------|`,
      `| Sentinela Drone | Ranged | 45 | 8-12 | Mantém distância de 10m e dispara rajadas de 3 tiros | 15 XP, 20 Créditos |`,
      `| Executor Blindado | Melee | 120 | 18-24 | Avança com escudo frontal e golpe pesado telegrafado | 40 XP, 1 Fragmento |`,
      `| Caçador Sombrio | Flanker | 75 | 14-18 | Flanqueia por pontos cegos usando teleporte curto | 30 XP, Módulo Comum |`,
      ``,
      `- **Chefes/Bosses & Fases:** 4 chefes principais (1 por região), cada qual com Fase 1 (padrões base), Fase 2 aos 60% HP (novos ataques em área) e Fase Enrage aos 25% HP.`,
      `- **Máquina de Estados de IA:** Estados \`Idle -> Patrol -> Alert -> Reposition -> Attack -> Staggered -> Dead\` com transição validada por linha de visão e distância.`,
      `- **Obstáculos Ambientais:** Pisos eletrificados cíclicos (3s ligado / 2s desligado), nuvens de vapor que bloqueiam visão e plataformas retráteis.`,
    ].join('\n');
  }

  return [
    `# 10. Interface do Usuário (UI/UX)`,
    `- **Menu Principal:** Fundo dinâmico em tempo real, botões Continuar, Novo Jogo, Selecionar Capítulo, Configurações e Acessibilidade.`,
    `- **HUD In-Game:** Barra de vida/energia no canto superior esquerdo, minimapa compacto no superior direito e barra de skills no rodapé.`,
    `- **Menus Secundários:** Pausa instantânea, Inventário em abas rápidas, Árvore de Skills e Diário de Missões.`,
    `- **Wireframes/Layout & Fluxo:** Grade segura de 5% de margem (Title Safe Area) para TVs e monitores ultrawide 21:9.`,
    `- **Design Responsivo:** Escala adaptativa para 16:9, 16:10 (Steam Deck) e 21:9 sem corte de elementos críticos.`,
    ``,
    `# 11. Roadmap de Desenvolvimento`,
    `- **Escopo do Projeto (MVP vs Full Version):**`,
    `  - **MVP (Vertical Slice):** 1 região completa (3 fases), 3 tipos de inimigos, 1 chefe, 4 habilidades e loop completo jogável em 4–6 meses.`,
    `  - **Full Version:** 4 regiões (12 fases), 10 tipos de inimigos, 4 chefes, árvore de 12 habilidades e modo desafio em 14–18 meses.`,
    ``,
    `| Fase | Duração | Entregáveis Principais | Equipe Focada |`,
    `|------|---------|------------------------|---------------|`,
    `| Pré-Produção & Protótipo | 2 meses | Core Loop jogável, GDD fechado, pipeline de arte | 3-4 pessoas |`,
    `| Vertical Slice (MVP) | 4 meses | 1 região polida, 1 boss, UI funcional e playtest | 5-6 pessoas |`,
    `| Produção Plena | 8 meses | 3 regiões restantes, balanceamento, áudio e narrativa | 6-8 pessoas |`,
    `| Alpha / Beta / QA | 3 meses | Otimização 60 FPS, localização e certificação | 6 pessoas |`,
    ``,
    `- **Equipe Recomendada:** 1 Game Designer, 2 Programadores, 1 Artista 2D/3D, 1 Tech Artist/Animator, 1 Sound Designer (part-time).`,
    `- **Budget Estimado:** Faixa Indie Enxuta (USD 120k–240k considerando equipe reduzida e vertical slice validado).`,
    ``,
    `# 12. Referências & Inspirações`,
    `- **Jogos Similares:** ${brief.inspirations ?? 'Hades (ritmo e clareza de combate), Hollow Knight (progressão espacial) e Dead Cells (responsividade)'}.`,
    `- **Inspirações Artísticas:** Arquitetura brutalista iluminada por neons frios e cartazes gráficos de alto contraste.`,
    `- **Documentação Extra:** Guia de estilo de UI, planilha de curva de dano/HP e roteiro de diálogos.`,
    ...(brief.multiplayer
      ? [
          ``,
          `# 13. Multiplayer, Netcode & LiveOps`,
          `- **Arquitetura de Rede & Tickrate:** Arquitetura Client-Server autoritativa (60 Hz em combate crítico, 30 Hz para sincronização de lobby) com predição client-side e reconciliação.`,
          `- **Matchmaking & Sessões:** Lobbies privados por código + fila cooperativa rápida para 2-4 jogadores com suporte a reconexão em até 90 segundos.`,
          `- **Anti-Cheat & Segurança:** Validação server-side de dano, cooldowns e inventário; nunca confiar em estado enviado pelo cliente.`,
          `- **Monetização Ética & LiveOps:** ${brief.monetization ?? 'Sem pay-to-win; apenas expansões de conteúdo e cosméticos opcionais'}.`,
        ]
      : []),
    ``,
    `# 14. Acessibilidade & Inclusão`,
    `- **Acessibilidade Visual & Daltonismo:** 3 filtros nativos (Protanopia, Deuteranopia, Tritanopia) + diferenciação de ameaças por forma e ícone além da cor.`,
    `- **Acessibilidade Auditiva & Legendas:** Legendas redimensionáveis (100%–150%) com identificação de emissor e indicadores direcionais visuais de som.`,
    `- **Controles Remapeáveis & Assistências:** Remapeamento completo de teclado/gamepad, opção de segurar vs alternar botões e slider de velocidade de combate (75%–100%).`,
    `- **Conforto Cognitivo & Motion Sickness:** Opção de desativar screen-shake, motion blur e flashes intensos.`,
    ``,
    `# 15. Manifesto de Assets, Telemetria & Riscos`,
    `| Categoria Asset | Quantidade Estimada | Complexidade | Prioridade |`,
    `|-----------------|---------------------|--------------|------------|`,
    `| Personagens & Inimigos | 14 modelos/rigs | Alta | P0 |`,
    `| Kits Modulares de Cenário | 48 peças por bioma | Média | P0 |`,
    `| Efeitos Visuais (VFX) | 35 partículas/shaders | Média | P1 |`,
    `| Áudio (SFX & Faixas) | 120 SFX + 10 faixas | Média | P1 |`,
    ``,
    `- **Eventos de Telemetria & KPIs:** \`session_start\`, \`boss_attempt\`, \`boss_defeat\`, \`player_death\` (com causa e localização), taxa de retenção D1/D7 e tempo médio por fase.`,
    ``,
    `| Risco Técnico / Produção | Probabilidade | Impacto | Mitigação |`,
    `|--------------------------|---------------|---------|-----------|`,
    `| Aumento de escopo em fases | Alta | Alto | Trava rígida de MVP com 1 região antes de escalar |`,
    `| Queda de framerate em partículas | Média | Alto | Object pooling e limite de luzes dinâmicas por cena |`,
  ].join('\n');
}
