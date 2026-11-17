import type { GddLanguage, GddSectionDefinition } from '@/types/gdd';

interface LocalizedTitles {
  'pt-BR': string;
  'en-US': string;
  es: string;
}

interface SectionBlueprint {
  number: number;
  key: string;
  titles: LocalizedTitles;
  optional: boolean;
  expectedSubsections: string[];
}

const SECTION_BLUEPRINTS: SectionBlueprint[] = [
  {
    number: 1,
    key: 'document_info',
    titles: {
      'pt-BR': '1. Informações do Documento',
      'en-US': '1. Document Information',
      es: '1. Información del Documento',
    },
    optional: false,
    expectedSubsections: ['Título do Jogo', 'Versão do GDD', 'Data de Criação', 'Status', 'Desenvolvedoras/Estúdio'],
  },
  {
    number: 2,
    key: 'executive_summary',
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
  },
  {
    number: 3,
    key: 'technical_specs',
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
  },
  {
    number: 4,
    key: 'visual_art_direction',
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
  },
  {
    number: 5,
    key: 'narrative_story',
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
  },
  {
    number: 6,
    key: 'gameplay_mechanics',
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
  },
  {
    number: 7,
    key: 'game_systems',
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
  },
  {
    number: 8,
    key: 'world_level_design',
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
  },
  {
    number: 9,
    key: 'enemies_challenges',
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
  },
  {
    number: 10,
    key: 'ui_ux',
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
  },
  {
    number: 11,
    key: 'development_roadmap',
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
  },
  {
    number: 12,
    key: 'references_inspirations',
    titles: {
      'pt-BR': '12. Referências & Inspirações',
      'en-US': '12. References & Inspirations',
      es: '12. Referencias e Inspiraciones',
    },
    optional: false,
    expectedSubsections: ['Jogos Similares', 'Inspirações Artísticas', 'Documentação Extra'],
  },
  {
    number: 13,
    key: 'multiplayer_liveops',
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
  },
  {
    number: 14,
    key: 'accessibility_inclusivity',
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
  },
  {
    number: 15,
    key: 'assets_telemetry_risks',
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
      title: bp.titles[language] ?? bp.titles['pt-BR'],
      optional: bp.optional,
      expectedSubsections: bp.expectedSubsections,
    })
  );
}

/**
 * Formats a human-readable list of all sections for prompts and navigation.
 */
export function getAllSectionNumbers(): number[] {
  return SECTION_BLUEPRINTS.map((bp) => bp.number);
}
