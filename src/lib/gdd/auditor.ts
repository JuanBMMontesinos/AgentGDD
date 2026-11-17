import { detectTechnicalConflicts } from '@/lib/gdd/conflict-detector';
import { countWords, extractColorSwatches, parseMarkdownTables } from '@/lib/gdd/parser';
import type {
  AuditReportResult,
  ChecklistItemResult,
  ConceptBrief,
  GddSectionRecord,
} from '@/types/gdd';

const VAGUE_QUANTIFIER_PATTERNS = [
  /\bmuitos?\s+(?:inimigos|itens|níveis|fases|poderes|recursos)\b/gi,
  /\bvári[oa]s\s+(?:inimigos|itens|níveis|fases|armas|habilidades)\b/gi,
  /\balgun[sa]s?\s+(?:inimigos|itens|níveis|fases)\b/gi,
  /\bmany\s+(?:enemies|items|levels|skills)\b/gi,
  /\bvarious\s+(?:enemies|items|levels|skills)\b/gi,
];

/**
 * Runs an automated 15-point quality, structural, and consistency audit against
 * the generated or edited GDD sections and original ConceptBrief.
 */
export function auditGddProject(
  brief: ConceptBrief,
  sections: Array<Pick<GddSectionRecord, 'section_number' | 'title' | 'content_markdown'>>
): AuditReportResult {
  const byNumber = new Map<number, string>();
  for (const s of sections) {
    byNumber.set(s.section_number, s.content_markdown ?? '');
  }

  const allText = sections.map((s) => s.content_markdown ?? '').join('\n\n');
  const vagueTermsFound: string[] = [];
  for (const pattern of VAGUE_QUANTIFIER_PATTERNS) {
    const found = allText.match(pattern);
    if (found) {
      vagueTermsFound.push(...found.map((t) => t.trim()));
    }
  }

  const sec1 = byNumber.get(1) ?? '';
  const sec2 = byNumber.get(2) ?? '';
  const sec3 = byNumber.get(3) ?? '';
  const sec4 = byNumber.get(4) ?? '';
  const sec5 = byNumber.get(5) ?? '';
  const sec6 = byNumber.get(6) ?? '';
  const sec7 = byNumber.get(7) ?? '';
  const sec8 = byNumber.get(8) ?? '';
  const sec9 = byNumber.get(9) ?? '';
  const sec10 = byNumber.get(10) ?? '';
  const sec11 = byNumber.get(11) ?? '';
  const sec12 = byNumber.get(12) ?? '';
  const sec14 = byNumber.get(14) ?? '';
  const sec15 = byNumber.get(15) ?? '';

  const mandatorySectionsPresent = Array.from({ length: 12 }, (_, idx) => idx + 1).every(
    (num) => countWords(byNumber.get(num) ?? '') >= (num === 1 ? 10 : 25)
  );

  const hexSwatches = extractColorSwatches(sec4);
  const sec9Tables = parseMarkdownTables(sec9);
  const sec11HasMvp = /mvp/i.test(sec11) && (/full/i.test(sec11) || /completa/i.test(sec11));
  const hasMermaidDiagram = /```mermaid\s+[\s\S]+?```/i.test(allText);

  const checklistResults: ChecklistItemResult[] = [
    {
      id: 'all-12-sections',
      label: 'Todas as 12 seções obrigatórias preenchidas',
      passed: mandatorySectionsPresent && countWords(sec1) >= 15,
      weight: 12,
      details: mandatorySectionsPresent
        ? 'Todas as 12 seções base possuem conteúdo substancial.'
        : 'Uma ou mais seções obrigatórias (1–12) estão vazias ou muito curtas (< 25 palavras).',
    },
    {
      id: 'genre-usp-audience',
      label: 'Gênero, Público-Alvo e USP claros (Seção 2)',
      passed:
        countWords(sec2) >= 40 &&
        /(usp|proposta|diferencial|unique)/i.test(sec2) &&
        /(público|audience|público-alvo|target)/i.test(sec2),
      weight: 8,
      details: 'Verifica presença de pitch executivo, público-alvo e proposta única de venda.',
    },
    {
      id: 'engine-platforms',
      label: 'Engine versionada e Plataformas especificadas (Seção 3)',
      passed:
        countWords(sec3) >= 30 &&
        /(unity|unreal|godot|gamemaker|custom|phaser)/i.test(sec3) &&
        /(fps|framerate|resolução|resolution)/i.test(sec3),
      weight: 8,
      details: 'Verifica engine recomendada com versão, câmera, resolução e framerate alvo.',
    },
    {
      id: 'hex-color-palette',
      label: 'Paleta de Cores com códigos HEX válidos (Seção 4)',
      passed: hexSwatches.length >= 3,
      weight: 8,
      details:
        hexSwatches.length >= 3
          ? `${hexSwatches.length} cores HEX estruturadas detectadas.`
          : 'Adicione pelo menos 3 cores HEX (#RRGGBB) na Seção 4.',
    },
    {
      id: 'narrative-arc',
      label: 'Narrativa com protagonista e estrutura em atos (Seção 5)',
      passed: countWords(sec5) >= 40 && /(ato|act|capítulo|chapter|protagonista)/i.test(sec5),
      weight: 7,
      details: 'Verifica sinopse, protagonista e progressão em atos/capítulos.',
    },
    {
      id: 'mechanics-controls',
      label: 'Controles e 3–5 Mecânicas Principais específicas (Seção 6)',
      passed: countWords(sec6) >= 50 && /(controle|control|loop|mecânica|mechanic)/i.test(sec6),
      weight: 8,
      details: 'Verifica controles base, core mechanics e fluxo de sessão.',
    },
    {
      id: 'game-systems-audio',
      label: 'Sistemas de Jogo, Economia, Save e Áudio (Seção 7)',
      passed:
        countWords(sec7) >= 50 &&
        /(economia|economy|save|salvar|áudio|audio|combate|combat)/i.test(sec7),
      weight: 8,
      details: 'Verifica cobertura de sistemas centrais e tabelas de equipamentos/habilidades.',
    },
    {
      id: 'world-level-design',
      label: 'Mundo do Jogo, Regiões e Level Design (Seção 8)',
      passed: countWords(sec8) >= 40,
      weight: 6,
      details: 'Verifica regiões, progressão espacial e interações com NPCs.',
    },
    {
      id: 'enemy-boss-tables',
      label: 'Tabelas estruturadas de Inimigos e Bosses (Seção 9)',
      passed: sec9Tables.length >= 1 && countWords(sec9) >= 40,
      weight: 8,
      details:
        sec9Tables.length >= 1
          ? `${sec9Tables.length} tabela(s) estruturada(s) encontrada(s) na Seção 9.`
          : 'Inclua tabela Markdown de inimigos (Nome | Tipo | Vida | Dano | Comportamento | Loot).',
    },
    {
      id: 'ui-ux-wireframes',
      label: 'UI/UX prático com Menu, HUD e Responsividade (Seção 10)',
      passed: countWords(sec10) >= 35 && /(hud|menu|wireframe|layout|responsiv)/i.test(sec10),
      weight: 6,
      details: 'Verifica especificações de HUD, menus secundários e layout.',
    },
    {
      id: 'realistic-roadmap',
      label: 'Roadmap realista diferenciando MVP vs Full Version (Seção 11)',
      passed: countWords(sec11) >= 40 && sec11HasMvp,
      weight: 8,
      details: 'Verifica separação explícita entre MVP e versão completa, equipe e orçamento.',
    },
    {
      id: 'references-inspirations',
      label: 'Referências justificadas e inspirações (Seção 12)',
      passed: countWords(sec12) >= 25,
      weight: 5,
      details: 'Verifica jogos similares e referências artísticas sem violação de IP.',
    },
    {
      id: 'numeric-precision',
      label: 'Precisão numérica (sem quantificadores vagos)',
      passed: vagueTermsFound.length === 0,
      weight: 3,
      details:
        vagueTermsFound.length === 0
          ? 'Nenhum quantificador vago detectado.'
          : `Substitua termos vagos por faixas numéricas concretas: ${vagueTermsFound.slice(0, 4).join(', ')}.`,
    },
    {
      id: 'visual-diagrams',
      label: 'Diagramas visuais de Loop/Economia/Fluxo (Mermaid)',
      passed: hasMermaidDiagram,
      weight: 3,
      details: hasMermaidDiagram
        ? 'Diagramas Mermaid detectados para visualização técnica.'
        : 'Adicione um bloco ```mermaid para visualizar o Core Gameplay Loop ou Economia.',
    },
    {
      id: 'accessibility-and-risks',
      label: 'Extensões Studio: Acessibilidade (14) e Assets/Riscos (15)',
      passed: countWords(sec14) >= 25 && countWords(sec15) >= 25,
      weight: 2,
      details: 'Verifica matriz de acessibilidade e plano quantificado de assets/riscos.',
    },
  ];

  const totalWeight = checklistResults.reduce((acc, item) => acc + item.weight, 0);
  const earnedWeight = checklistResults.reduce(
    (acc, item) => acc + (item.passed ? item.weight : 0),
    0
  );
  const overallScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  const conflictsDetected = detectTechnicalConflicts(brief);
  const recommendations: string[] = [];

  for (const item of checklistResults) {
    if (!item.passed) {
      recommendations.push(`${item.label}: ${item.details}`);
    }
  }
  for (const conflict of conflictsDetected) {
    if (conflict.severity !== 'info') {
      recommendations.push(`[${conflict.severity.toUpperCase()}] ${conflict.title}: ${conflict.suggestion}`);
    }
  }

  return {
    overallScore,
    checklistResults,
    conflictsDetected,
    recommendations,
    vagueTermsFound,
  };
}
