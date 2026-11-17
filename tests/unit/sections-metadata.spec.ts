import { expect, test } from '@playwright/test';
import {
  getSectionDefinitionByNumber,
  getSectionDefinitions,
  getSectionGroups,
} from '../../src/lib/gdd/sections';

test.describe('Section Metadata & Discipline Grouping Unit Tests', () => {
  test('organizes all 15 sections into 4 discipline groups (A-D)', () => {
    const groups = getSectionGroups('pt-BR', true);
    expect(groups.map((g) => g.id)).toEqual(['A', 'B', 'C', 'D']);

    expect(groups[0].sections.map((s) => s.number)).toEqual([1, 2, 3, 4]);
    expect(groups[1].sections.map((s) => s.number)).toEqual([5, 6]);
    expect(groups[2].sections.map((s) => s.number)).toEqual([7, 8, 9]);
    expect(groups[3].sections.map((s) => s.number)).toEqual([10, 11, 12, 13, 14, 15]);
  });

  test('excludes section 13 when multiplayer is disabled', () => {
    const defs = getSectionDefinitions('pt-BR', false);
    expect(defs.some((d) => d.number === 13)).toBe(false);
    expect(defs).toHaveLength(14);
  });

  test('provides tutorial summary, rationale, and example refine prompts for every section', () => {
    for (let num = 1; num <= 15; num += 1) {
      const def = getSectionDefinitionByNumber(num, 'pt-BR');
      expect(def).toBeDefined();
      expect(def!.summary.length).toBeGreaterThan(15);
      expect(def!.whyItMatters.length).toBeGreaterThan(15);
      expect(def!.exampleRefinePrompts.length).toBeGreaterThanOrEqual(2);
    }
  });
});
