import { expect, test } from '@playwright/test';
import { generateMockStageMarkdown } from '../../src/lib/gdd/mock-generator';
import {
  countWords,
  extractColorSwatches,
  extractEntitiesFromSections,
  getContrastTextColor,
  parseMarkdownTables,
  parseSectionsFromMarkdown,
} from '../../src/lib/gdd/parser';

test.describe('GDD Parser Unit Tests', () => {
  const sampleBrief = {
    title: 'Neon Blades',
    idea: 'Ação cyberpunk em primeira pessoa com parkour e combate corpo-a-corpo.',
    multiplayer: true,
  };

  test('parses all 15 numbered sections across generated stages', () => {
    const fullMarkdown = [1, 2, 3, 4]
      .map((stage) => generateMockStageMarkdown(sampleBrief, stage))
      .join('\n\n');

    const sections = parseSectionsFromMarkdown(fullMarkdown);
    expect(sections).toHaveLength(15);
    expect(sections[0].sectionNumber).toBe(1);
    expect(sections[14].sectionNumber).toBe(15);
    expect(countWords(sections[3].contentMarkdown)).toBeGreaterThan(20);
  });

  test('extracts valid HEX color swatches and calculates accessible contrast text color', () => {
    const stage1 = generateMockStageMarkdown(sampleBrief, 1);
    const swatches = extractColorSwatches(stage1);

    expect(swatches.length).toBeGreaterThanOrEqual(5);
    expect(swatches[0].hex).toMatch(/^#[0-9A-F]{6}$/);

    expect(getContrastTextColor('#0F172A')).toBe('#FFFFFF');
    expect(getContrastTextColor('#E2E8F0')).toBe('#000000');
  });

  test('extracts structured entities from Markdown tables across sections', () => {
    const fullMarkdown = [1, 2, 3, 4]
      .map((stage) => generateMockStageMarkdown(sampleBrief, stage))
      .join('\n\n');
    const sections = parseSectionsFromMarkdown(fullMarkdown);
    const entities = extractEntitiesFromSections('proj-123', sections);

    const types = new Set(entities.map((e) => e.entity_type));
    expect(types.has('color_swatch')).toBe(true);
    expect(types.has('equipment')).toBe(true);
    expect(types.has('skill')).toBe(true);
    expect(types.has('enemy')).toBe(true);
    expect(types.has('roadmap_phase')).toBe(true);
    expect(types.has('asset_estimate')).toBe(true);
    expect(types.has('risk_item')).toBe(true);
  });

  test('parses Markdown pipe tables cleanly', () => {
    const md = `
| Nome | Tipo | Vida | Dano |
|---|---|---|---|
| Drone | Ranged | 40 | 10 |
| Brute | Melee | 120 | 25 |
`;
    const tables = parseMarkdownTables(md);
    expect(tables).toHaveLength(1);
    expect(tables[0].headers).toEqual(['Nome', 'Tipo', 'Vida', 'Dano']);
    expect(tables[0].rows).toHaveLength(2);
    expect(tables[0].rows[1][0]).toBe('Brute');
  });
});
