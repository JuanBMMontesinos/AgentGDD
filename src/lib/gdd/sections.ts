import type { GddLanguage, GddSectionDefinition, GddSectionGroupId } from '@/types/gdd';

interface LocalizedTitles {
  'pt-BR': string;
  'en-US': string;
  es: string;
}

interface SectionBlueprint {
  number: number;
  key: string;
  groupId: GddSectionGroupId;
  titles: LocalizedTitles;
  optional: boolean;
  expectedSubsections: string[];
  summary: string;
  whyItMatters: string;
  specialToolHint?: string;
  exampleRefinePrompts: string[];
}

export interface GddSectionGroup {
  id: GddSectionGroupId;
  label: string;
  description: string;
  sections: GddSectionDefinition[];
}

const GROUP_LABELS: Record<GddSectionGroupId, { label: string; description: string }> = {
  A: {
    label: 'A. Conceito & Direção (1–4)',
    description: 'Identificação, proposta de valor, arquitetura técnica e identidade visual.',
  },
  B: {
    label: 'B. Narrativa & Gameplay (5–6)',
    description: 'História, protagonistas, controles e core loop jogável.',
  },
  C: {
    label: 'C. Sistemas, Mundo & Desafios (7–9)',
    description: 'Combate, economia, áudio, fases, inimigos e chefes.',
  },
  D: {
    label: 'D. UI, Produção & Studio (10–15)',
    description: 'Interface, roadmap MVP/Full, referências, netcode, acessibilidade e riscos.',
  },
};

const SECTION_BLUEPRINTS: SectionBlueprint[] = [
  {
    number: 1,
    key: 'document_info',
    groupId: 'A',
    titles: {
      'pt-BR': '1. Informações do Documento',
      'en-US': '1. Document Information',
      es: '1. Información del Documento',
    },
    optional: false,
    expectedSubsections: ['Título do Jogo', 'Versão do GDD', 'Data de Criação', 'Status', 'Desenvolvedoras/Estúdio'],
    summary: 'Ficha técnica com título, versão, data, estágio de produção e estúdio responsável.',
    whyItMatters: 'Garante que toda a equipe saiba em qual revisão do documento está trabalhando.',
    exampleRefinePrompts: [
      'Atualizar status para Vertical Slice e detalhar créditos da equipe',
      'Adicionar resumo rápido de escopo e metas do trimestre',
    ],
  },
  {
    number: 2,
    key: 'executive_summary',
    groupId: 'A',
    titles: {
      'pt-BR': '2. Visão Geral do Projeto (Executive Summary)',
      'en-US': '2. Project Overview (Executive Summary)',
      es: '2. Visión General del Proyecto (Executive Summary)',
    },
    optional: false,
    expectedSubsections: [
      'Conceito Principal',
      'Descrição Executiva',
      'Gênero Primário e Secundário',
      'Público-Alvo',
      'Plataformas Alvo',
      'USP - Proposta Única de Venda',
    ],
    summary: 'Pitch executivo, gêneros, público-alvo, plataformas e diferencial competitivo (USP).',
    whyItMatters: 'Alinha visão de produto e pitch para equipe, investidores e publishers.',
    exampleRefinePrompts: [
      'Tornar a USP mais forte frente aos 3 principais concorrentes do gênero',
      'Definir perfil detalhado de jogador-alvo e faixa etária',
    ],
  },
  {
    number: 3,
    key: 'technical_specs',
    groupId: 'A',
    titles: {
      'pt-BR': '3. Especificações Técnicas',
      'en-US': '3. Technical Specifications',
      es: '3. Especificaciones Técnicas',
    },
    optional: false,
    expectedSubsections: [
      'Engine Recomendada',
      'Linguagem de Programação',
      'Dimensionalidade',
      'Perspectiva de Câmera',
      'Resolução Alvo',
      'Framerate Objetivo',
      'Plataformas e Requerimentos Mínimos',
    ],
    summary: 'Engine versionada, linguagem, 2D/2.5D/3D, câmera, resolução, FPS e requisitos mínimos.',
    whyItMatters: 'Define restrições de engenharia cedo e evita incompatibilidades entre engine e plataforma.',
    exampleRefinePrompts: [
      'Especificar requisitos mínimos para Steam Deck e PC intermediário',
      'Detalhar pipeline de renderização e orçamento de performance a 60 FPS',
    ],
  },
  {
    number: 4,
    key: 'visual_art_direction',
    groupId: 'A',
    titles: {
      'pt-BR': '4. Estilo Visual & Direção de Arte',
      'en-US': '4. Visual Style & Art Direction',
      es: '4. Estilo Visual y Dirección de Arte',
    },
    optional: false,
    expectedSubsections: [
      'Estilo Artístico',
      'Justificativa do Estilo',
      'Paleta de Cores Principal',
      'Inspirações Visuais',
      'Especificações de Resolução de Assets',
      'Análise Comparativa',
    ],
    summary: 'Identidade estética, justificativa de produção, paleta HEX (#RRGGBB) e resolução de assets.',
    whyItMatters: 'Guia artistas 2D/3D e UI na leitura visual do jogo e controla custos de arte.',
    specialToolHint: 'Códigos #RRGGBB desta seção alimentam automaticamente a Paleta HEX Visual e o gerador de Moodboard.',
    exampleRefinePrompts: [
      'Expandir paleta para 6 cores HEX com foco em acessibilidade e contraste',
      'Detalhar especificações de sprites/texturas e iluminação por bioma',
    ],
  },
  {
    number: 5,
    key: 'narrative_story',
    groupId: 'B',
    titles: {
      'pt-BR': '5. Narrativa & História',
      'en-US': '5. Narrative & Story',
      es: '5. Narrativa e Historia',
    },
    optional: false,
    expectedSubsections: [
      'Premissa/Sinopse',
      'Protagonista',
      'Personagens Secundários',
      'Estrutura Narrativa',
      'Temas Principais',
      'Tom/Atmosfera',
    ],
    summary: 'Premissa, protagonista com arco narrativo, elenco secundário, atos/capítulos e tom.',
    whyItMatters: 'Conecta motivação emocional do jogador com a progressão dos níveis.',
    exampleRefinePrompts: [
      'Dividir a história em 3 Atos claros com pontos de virada',
      'Enxugar a narrativa para storytelling ambiental sem cutscenes longas',
    ],
  },
  {
    number: 6,
    key: 'gameplay_mechanics',
    groupId: 'B',
    titles: {
      'pt-BR': '6. Mecânicas de Gameplay',
      'en-US': '6. Gameplay Mechanics',
      es: '6. Mecánicas de Gameplay',
    },
    optional: false,
    expectedSubsections: [
      'Controles Base',
      'Mecânicas Principais',
      'Mecânicas Secundárias',
      'Sistema de Progressão',
      'Dificuldade & Balanceamento',
      'Fluxo de Jogo (Core Loop)',
    ],
    summary: 'Controles, 3–5 mecânicas principais com números exatos, balanceamento e Core Loop.',
    whyItMatters: 'Define o que o jogador faz minuto a minuto e serve de spec direta para o protótipo jogável.',
    specialToolHint: 'Blocos ```mermaid desta seção são renderizados como diagramas visuais na leitura.',
    exampleRefinePrompts: [
      'Detalhar valores de frame data, cooldown e custo de cada mecânica principal',
      'Adicionar diagrama Mermaid completo do Core Loop minuto a minuto',
    ],
  },
  {
    number: 7,
    key: 'game_systems',
    groupId: 'C',
    titles: {
      'pt-BR': '7. Sistemas de Jogo',
      'en-US': '7. Game Systems',
      es: '7. Sistemas de Juego',
    },
    optional: false,
    expectedSubsections: [
      'Sistema de Combate',
      'Sistema de Inventário & Equipamento',
      'Sistema de Progressão & Leveling',
      'Sistema de Economia',
      'Sistema de Salvar/Carregar',
      'Sistema de UI/Menu',
      'Sistema de Áudio & Música Adaptativa',
    ],
    summary: 'Combate, inventário, leveling, economia, save/load e áudio adaptativo com tabelas.',
    whyItMatters: 'Especifica as regras sistêmicas e tabelas de equipamentos e habilidades para programação.',
    specialToolHint: 'Tabelas de Equipamentos e Skills desta seção são sincronizadas com Ferramentas -> Tabelas Estruturadas.',
    exampleRefinePrompts: [
      'Adicionar 4 novos equipamentos e 4 skills balanceadas em tabela',
      'Detalhar fontes e sumidouros da economia para evitar inflação no endgame',
    ],
  },
  {
    number: 8,
    key: 'world_level_design',
    groupId: 'C',
    titles: {
      'pt-BR': '8. Mundo do Jogo & Level Design',
      'en-US': '8. Game World & Level Design',
      es: '8. Mundo del Juego y Level Design',
    },
    optional: false,
    expectedSubsections: [
      'Descrição do Mundo',
      'Regiões/Níveis Principais',
      'Detalhes de Level Design',
      'Estrutura de Progressão',
      'NPCs & Interações',
    ],
    summary: 'Ambientação, regiões/biomas, ritmo das fases, progressão de mapa e NPCs.',
    whyItMatters: 'Orienta level designers na criação de rotas, ritmo de desafios e recompensas espaciais.',
    exampleRefinePrompts: [
      'Detalhar a estrutura sala a sala da Região 1 para o Vertical Slice',
      'Criar 4 NPCs marcantes com papel funcional e narrativo no hub',
    ],
  },
  {
    number: 9,
    key: 'enemies_challenges',
    groupId: 'C',
    titles: {
      'pt-BR': '9. Design de Inimigos & Desafios',
      'en-US': '9. Enemy & Challenge Design',
      es: '9. Diseño de Enemigos y Desafíos',
    },
    optional: false,
    expectedSubsections: [
      'Tipos de Inimigos',
      'Chefes/Bosses & Fases',
      'Máquina de Estados de IA',
      'Obstáculos Ambientais',
      'Dificuldade Progressiva',
    ],
    summary: 'Tabela de inimigos, chefes com múltiplas fases, estados de IA e armadilhas ambientais.',
    whyItMatters: 'Define o repertório de combate e comportamento de IA para programadores e animadores.',
    specialToolHint: 'Tabelas de Inimigos e Bosses alimentam diretamente a aba de Tabelas Estruturadas.',
    exampleRefinePrompts: [
      'Adicionar mais 3 arquétipos de inimigos com sinergia entre si',
      'Detalhar fases 1, 2 e Enrage de 2 chefes principais',
    ],
  },
  {
    number: 10,
    key: 'ui_ux',
    groupId: 'D',
    titles: {
      'pt-BR': '10. Interface do Usuário (UI/UX)',
      'en-US': '10. User Interface (UI/UX)',
      es: '10. Interfaz de Usuario (UI/UX)',
    },
    optional: false,
    expectedSubsections: [
      'Menu Principal',
      'HUD In-Game',
      'Menus Secundários',
      'Wireframes/Layout & Fluxo',
      'Design Responsivo',
    ],
    summary: 'Estrutura de menus, HUD in-game, fluxos de navegação, wireframes e responsividade.',
    whyItMatters: 'Garante clareza de informação em tela e ergonomia entre PC, Console e Mobile.',
    exampleRefinePrompts: [
      'Descrever wireframe detalhado do HUD e regra de Safe Area para TVs e Steam Deck',
      'Adicionar fluxo Mermaid de navegação entre Menu Principal, Hub e Pausa',
    ],
  },
  {
    number: 11,
    key: 'development_roadmap',
    groupId: 'D',
    titles: {
      'pt-BR': '11. Roadmap de Desenvolvimento',
      'en-US': '11. Development Roadmap',
      es: '11. Roadmap de Desarrollo',
    },
    optional: false,
    expectedSubsections: [
      'Escopo do Projeto (MVP vs Full Version)',
      'Fases de Desenvolvimento',
      'Estimativa de Tempo & Vertical Slice',
      'Equipe Recomendada',
      'Budget Estimado',
    ],
    summary: 'Corte MVP vs Full Version, tabela de fases, equipe recomendada, cronograma e budget.',
    whyItMatters: 'Transforma o design em plano executável realista e alimenta o CSV Backlog.',
    specialToolHint: 'As fases desta seção são exportadas no arquivo CSV Backlog para Jira/Linear/Trello.',
    exampleRefinePrompts: [
      'Recalcular cronograma e budget para equipe indie enxuta de 3 pessoas',
      'Detalhar entregáveis exatos do Vertical Slice em 12 semanas',
    ],
  },
  {
    number: 12,
    key: 'references_inspirations',
    groupId: 'D',
    titles: {
      'pt-BR': '12. Referências & Inspirações',
      'en-US': '12. References & Inspirations',
      es: '12. Referencias e Inspiraciones',
    },
    optional: false,
    expectedSubsections: ['Jogos Similares', 'Inspirações Artísticas', 'Documentação Extra'],
    summary: 'Jogos de referência com análise comparativa, inspirações artísticas e docs extras.',
    whyItMatters: 'Alinha expectativas estéticas e mecânicas sem copiar propriedade intelectual.',
    exampleRefinePrompts: [
      'Comparar o que adotar e o que evitar de cada jogo referência listado',
      'Incluir inspirações de cinema, arquitetura e trilha sonora',
    ],
  },
  {
    number: 13,
    key: 'multiplayer_liveops',
    groupId: 'D',
    titles: {
      'pt-BR': '13. Multiplayer, Netcode & LiveOps',
      'en-US': '13. Multiplayer, Netcode & LiveOps',
      es: '13. Multijugador, Netcode y LiveOps',
    },
    optional: true,
    expectedSubsections: [
      'Arquitetura de Rede & Tickrate',
      'Matchmaking & Sessões',
      'Anti-Cheat & Segurança',
      'Monetização Ética & LiveOps',
    ],
    summary: 'Topologia de rede, tickrate, matchmaking, proteção anti-cheat e modelo LiveOps.',
    whyItMatters: 'Evita decisões inseguras em jogos online e orienta infraestrutura de servidores.',
    exampleRefinePrompts: [
      'Especificar arquitetura Client-Server autoritativa e mitigação de latência',
      'Definir plano ético de temporadas e retenção pós-lançamento',
    ],
  },
  {
    number: 14,
    key: 'accessibility_inclusivity',
    groupId: 'D',
    titles: {
      'pt-BR': '14. Acessibilidade & Inclusão',
      'en-US': '14. Accessibility & Inclusivity',
      es: '14. Accesibilidad e Inclusión',
    },
    optional: true,
    expectedSubsections: [
      'Acessibilidade Visual & Daltonismo',
      'Acessibilidade Auditiva & Legendas',
      'Controles Remapeáveis & Assistências',
      'Conforto Cognitivo & Motion Sickness',
    ],
    summary: 'Daltonismo, legendas escaláveis, controles remapeáveis, assistências e conforto visual.',
    whyItMatters: 'Amplia o alcance do jogo e garante conformidade com diretrizes modernas de acessibilidade.',
    exampleRefinePrompts: [
      'Detalhar presets de assistência de dificuldade e indicadores visuais de áudio',
      'Incluir checklist completo de conforto contra motion sickness e fotossensibilidade',
    ],
  },
  {
    number: 15,
    key: 'assets_telemetry_risks',
    groupId: 'D',
    titles: {
      'pt-BR': '15. Manifesto de Assets, Telemetria & Riscos',
      'en-US': '15. Asset Manifest, Telemetry & Risks',
      es: '15. Manifiesto de Assets, Telemetría y Riesgos',
    },
    optional: true,
    expectedSubsections: [
      'Manifesto Quantificado de Assets',
      'Eventos de Telemetria & KPIs',
      'Matriz de Riscos Técnicos & Mitigação',
      'Critérios de Playtest & Lançamento',
    ],
    summary: 'Contagem estimada de assets, eventos de telemetria, KPIs e matriz de riscos técnicos.',
    whyItMatters: 'Conecta produção artística e QA a métricas concretas antes do lançamento.',
    specialToolHint: 'Linhas de Assets e Riscos também entram na exportação CSV Backlog.',
    exampleRefinePrompts: [
      'Detalhar lista quantificada de animações, VFX e SFX por categoria',
      'Adicionar 5 eventos de telemetria e critérios objetivos de aprovação no playtest',
    ],
  },
];

/**
 * Returns the ordered GDD section definitions localized for the selected language.
 * Sections 1-12 are mandatory; sections 13-15 are studio-grade extensions.
 */
export function getSectionDefinitions(
  language: GddLanguage = 'pt-BR',
  includeMultiplayerSection = true
): GddSectionDefinition[] {
  return SECTION_BLUEPRINTS.filter((bp) => bp.number !== 13 || includeMultiplayerSection).map(
    (bp) => ({
      number: bp.number,
      key: bp.key,
      groupId: bp.groupId,
      title: bp.titles[language] ?? bp.titles['pt-BR'],
      optional: bp.optional,
      expectedSubsections: bp.expectedSubsections,
      summary: bp.summary,
      whyItMatters: bp.whyItMatters,
      specialToolHint: bp.specialToolHint,
      exampleRefinePrompts: bp.exampleRefinePrompts,
    })
  );
}

/**
 * Groups section definitions into the 4 Studio discipline blocks (A, B, C, D).
 */
export function getSectionGroups(
  language: GddLanguage = 'pt-BR',
  includeMultiplayerSection = true
): GddSectionGroup[] {
  const defs = getSectionDefinitions(language, includeMultiplayerSection);
  const order: GddSectionGroupId[] = ['A', 'B', 'C', 'D'];

  return order.map((groupId) => ({
    id: groupId,
    label: GROUP_LABELS[groupId].label,
    description: GROUP_LABELS[groupId].description,
    sections: defs.filter((s) => s.groupId === groupId),
  }));
}

/**
 * Returns contextual Studio metadata for a single section number (1..15).
 */
export function getSectionDefinitionByNumber(
  sectionNumber: number,
  language: GddLanguage = 'pt-BR'
): GddSectionDefinition | undefined {
  return getSectionDefinitions(language, true).find((s) => s.number === sectionNumber);
}

/**
 * Formats a human-readable list of all section numbers.
 */
export function getAllSectionNumbers(): number[] {
  return SECTION_BLUEPRINTS.map((bp) => bp.number);
}
