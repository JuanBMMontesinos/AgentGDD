import { detectTechnicalConflicts } from '@/lib/gdd/conflict-detector';
import { getSectionDefinitions } from '@/lib/gdd/sections';
import type { ConceptBrief, GddDepthMode, GddLanguage } from '@/types/gdd';

export interface GenerationStageSpec {
  stageNumber: number;
  label: string;
  sectionNumbers: number[];
}

/**
 * Multi-stage generation stages to guarantee deep 20-40 page quality without token truncation.
 */
export function getGenerationStages(includeMultiplayer: boolean): GenerationStageSpec[] {
  return [
    {
      stageNumber: 1,
      label: 'Seções 1–4: Documento, Visão Geral, Arquitetura Técnica & Arte HEX',
      sectionNumbers: [1, 2, 3, 4],
    },
    {
      stageNumber: 2,
      label: 'Seções 5–6: Narrativa, Controles, Mecânicas & Core Loop Mermaid',
      sectionNumbers: [5, 6],
    },
    {
      stageNumber: 3,
      label: 'Seções 7–9: Sistemas, Economia, Mundo, Inimigos & Bosses',
      sectionNumbers: [7, 8, 9],
    },
    {
      stageNumber: 4,
      label: includeMultiplayer
        ? 'Seções 10–15: UI/UX, Roadmap, Referências, Netcode, Acessibilidade & Riscos'
        : 'Seções 10–12 + 14–15: UI/UX, Roadmap, Referências, Acessibilidade & Riscos',
      sectionNumbers: includeMultiplayer ? [10, 11, 12, 13, 14, 15] : [10, 11, 12, 14, 15],
    },
  ];
}

/**
 * Builds the master system instruction derived directly from Prompt-Agente-GDD-IA
 * and expanded with Studio-grade engineering modules.
 */
export function buildMasterSystemInstruction(
  language: GddLanguage,
  depthMode: GddDepthMode
): string {
  const languageLabel =
    language === 'en-US' ? 'English (US)' : language === 'es' ? 'Español' : 'Português (Brasil)';
  const depthInstruction =
    depthMode === 'mvp'
      ? 'Modo MVP Enxuto: seja objetivo, prático e focado no escopo mínimo viável implementável, mantendo TODAS as seções e tabelas obrigatórias.'
      : 'Modo Bíblia Completa de Estúdio: aprofunde cada subseção com parâmetros numéricos implementáveis, exemplos concretos, tabelas ricas e diagramas Mermaid para servir como bíblia de produção.';

  return [
    `Você é um Especialista em Game Design Document (GDD) de nível profissional.`,
    `Idioma obrigatório de saída: ${languageLabel}.`,
    depthInstruction,
    ``,
    `REGRAS INEGOCIÁVEIS DE QUALIDADE E FORMATAÇÃO:`,
    `1. Use títulos exatos no formato "# N. Título da Seção" (ex: "# 1. Informações do Documento", "# 2. Visão Geral do Projeto (Executive Summary)", etc.) e "##" / "###" para subseções.`,
    `2. Voz ativa ("O jogador controla..."), tom profissional e precisão numérica rigorosa (NUNCA escreva "muitos inimigos" ou "várias fases"; use números exatos ou faixas como "6-8 tipos", "12 níveis").`,
    `3. Motores gráficos sempre versionados: Unity (2022 LTS+), Unreal Engine (UE5.3+/5.4+), Godot (4.1+/4.3+).`,
    `4. Dimensionalidade explícita: 2D Puro, 2.5D ou 3D. Plataformas com especificações claras.`,
    `5. Seção 4 DEVE conter tabela Markdown de Paleta de Cores com códigos #RRGGBB válidos (mínimo 5 cores) e tabela de Análise Comparativa.`,
    `6. Seção 6 e Seção 7 DEVEM incluir pelo menos 1 bloco \`\`\`mermaid validado (Core Gameplay Loop e/ou Fluxo de Economia) com labels entre aspas quando houver parênteses.`,
    `7. Seção 7 DEVE incluir tabelas de Equipamento (| Nome | Tipo | Stats | Efeito Especial | Raridade |) e Skills/Habilidades (| Nome | Tipo | Custo | Efeito | Cooldown |), além de Áudio Adaptativo e Save/Load.`,
    `8. Seção 9 DEVE incluir tabela de Inimigos (| Nome | Tipo | Vida | Dano | Comportamento | Loot |) e Bosses com fases.`,
    `9. Seção 11 DEVE diferenciar explicitamente MVP vs Full Version, incluir tabela de Fases de Desenvolvimento, estimativa realista de tempo/equipe/budget e Vertical Slice.`,
    `10. Não copie propriedade intelectual protegida; crie inspirado em referências.`,
    `11. Se houver conflitos técnicos no briefing, registre o alerta na Seção 3 e proponha a mitigação prática.`,
  ].join('\n');
}

/**
 * Formats the user's ConceptBrief and detected conflicts into structured prompt context.
 */
export function formatBriefContext(brief: ConceptBrief): string {
  const conflicts = detectTechnicalConflicts(brief);
  const warningsText =
    conflicts.length > 0
      ? conflicts
          .map((w) => `- [${w.severity.toUpperCase()}] ${w.title}: ${w.detail} (Sugestão: ${w.suggestion})`)
          .join('\n')
      : 'Nenhum conflito crítico prévio detectado.';

  return [
    `## BRIEFING DO PROJETO`,
    `- **Título Provisório:** ${brief.title}`,
    `- **Estúdio / Desenvolvedora:** ${brief.studioName || 'Não especificado (sugerir padrão profissional)'}`,
    `- **Ideia / Conceito:** ${brief.idea}`,
    `- **Gênero Primário:** ${brief.genrePrimary || 'Recomendar melhor opção'}`,
    `- **Gênero Secundário:** ${brief.genreSecondary || 'Recomendar'}`,
    `- **Engine Preferida:** ${brief.engine || 'Não especificada (recomendar a melhor baseada no gênero/escopo)'}`,
    `- **Dimensionalidade:** ${brief.dimensionality || 'Não especificada (recomendar)'}`,
    `- **Perspectiva de Câmera:** ${brief.camera || 'Não especificada (recomendar)'}`,
    `- **Plataformas Alvo:** ${brief.platforms?.length ? brief.platforms.join(', ') : 'Recomendar plataformas ideais'}`,
    `- **Tamanho da Equipe:** ${brief.teamSize || 'Indie Pequena (3-6 pessoas)'}`,
    `- **Público-Alvo:** ${brief.targetAudience || 'Definir com faixa etária e perfil'}`,
    `- **Monetização:** ${brief.monetization || 'Recomendar modelo sustentável'}`,
    `- **Multiplayer Online:** ${brief.multiplayer ? 'Sim' : 'Não especificado'}`,
    `- **Prazo / Orçamento Alvo:** ${brief.targetTimeline || 'Realista para o escopo'} / ${brief.targetBudget || 'Estimar por fase'}`,
    `- **Inspirações Informadas:** ${brief.inspirations || 'Recomendar 3-5 jogos similares relevantes'}`,
    ``,
    `## ALERTAS TÉCNICOS PRÉ-ANALISADOS`,
    warningsText,
  ].join('\n');
}

/**
 * Builds the prompt for a specific stage (1..4) with prior context summary so later stages
 * maintain strict numeric and narrative coherence with earlier sections.
 */
export function buildStagePrompt(params: {
  brief: ConceptBrief;
  language: GddLanguage;
  stage: GenerationStageSpec;
  priorSummary: string;
}): string {
  const defs = getSectionDefinitions(params.language, Boolean(params.brief.multiplayer));
  const targetDefs = defs.filter((d) => params.stage.sectionNumbers.includes(d.number));

  const sectionInstructions = targetDefs
    .map(
      (def) =>
        `### Seção obrigatória: "# ${def.title}"\nSubseções esperadas: ${def.expectedSubsections.join(', ')}.`
    )
    .join('\n\n');

  return [
    formatBriefContext(params.brief),
    params.priorSummary ? `\n## CONTEXTO JÁ DEFINIDO NAS SEÇÕES ANTERIORES\n${params.priorSummary}` : '',
    `\n## TAREFA DESTE ESTÁGIO (${params.stage.label})`,
    `Gere exclusivamente as seguintes seções completas em Markdown rico, respeitando exatamente a numeração "# N. ...":`,
    sectionInstructions,
    `\nData atual de referência: ${new Date().toISOString().slice(0, 10)}.`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Builds a targeted prompt to refine or expand one existing GDD section using Gemini AI.
 */
export function buildSectionRefinePrompt(params: {
  brief: ConceptBrief;
  sectionTitle: string;
  currentContent: string;
  userInstruction: string;
  crossSectionContext: string;
}): string {
  return [
    formatBriefContext(params.brief),
    `\n## RESUMO DE COERÊNCIA DO DOCUMENTO`,
    params.crossSectionContext,
    `\n## SEÇÃO ATUAL: ${params.sectionTitle}`,
    params.currentContent,
    `\n## INSTRUÇÃO DE REFINAMENTO DO USUÁRIO`,
    params.userInstruction,
    `\nReescreva apenas o corpo desta seção em Markdown profissional (sem repetir o heading "# N. Título" no topo), preservando consistência com as demais seções, tabelas bem formatadas e números concretos.`,
  ].join('\n');
}
