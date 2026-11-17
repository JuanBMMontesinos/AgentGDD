import { expect, test } from '@playwright/test';
import { auditGddProject } from '../../src/lib/gdd/auditor';
import { generateMockStageMarkdown } from '../../src/lib/gdd/mock-generator';
import { parseSectionsFromMarkdown } from '../../src/lib/gdd/parser';

test.describe('GDD Quality Auditor Unit Tests', () => {
  test('gives high score when all 15 sections, tables, HEX palette and Mermaid exist', () => {
    const brief = {
      title: 'Neon Blades',
      idea: 'Combate cyberpunk co-op com parkour vertical',
      engine: 'Unreal Engine 5.4+',
      dimensionality: '3D',
      camera: 'Primeira Pessoa',
      platforms: ['PC', 'PS5'],
      multiplayer: true,
    };

    const fullMarkdown = [1, 2, 3, 4]
      .map((s) => generateMockStageMarkdown(brief, s))
      .join('\n\n');
    const parsed = parseSectionsFromMarkdown(fullMarkdown);

    const report = auditGddProject(
      brief,
      parsed.map((p) => ({
        section_number: p.sectionNumber,
        title: p.title,
        content_markdown: p.contentMarkdown,
      }))
    );

    expect(report.overallScore).toBeGreaterThanOrEqual(90);
    expect(report.vagueTermsFound).toHaveLength(0);
    expect(report.checklistResults.every((c) => c.passed)).toBe(true);
  });

  test('detects missing sections, missing HEX codes, and vague quantifiers', () => {
    const brief = {
      title: 'Rascunho Incompleto',
      idea: 'Um jogo legal',
    };

    const report = auditGddProject(brief, [
      {
        section_number: 1,
        title: '1. Informações do Documento',
        content_markdown: 'Apenas um rascunho curto com muitos inimigos e várias fases genéricas.',
      },
    ]);

    expect(report.overallScore).toBeLessThan(30);
    expect(report.vagueTermsFound.length).toBeGreaterThanOrEqual(2);
    expect(report.recommendations.length).toBeGreaterThan(5);
  });
});
