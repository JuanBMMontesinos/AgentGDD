import { expect, test } from '@playwright/test';
import {
  exportProjectAsJson,
  exportProjectAsMarkdown,
  exportRoadmapAsCsv,
} from '../../src/lib/gdd/exporters';
import type { GddEntityRecord, GddProjectRecord, GddSectionRecord } from '../../src/types/gdd';

test.describe('GDD Exporters Unit Tests', () => {
  const project: GddProjectRecord = {
    id: 'p1',
    owner_id: 'u1',
    title: 'Neon Blades, "Overdrive"',
    slug: 'neon-blades',
    version_label: 'v1.0',
    status: 'Pré-Produção',
    studio_name: 'Studio Zero',
    language: 'pt-BR',
    depth_mode: 'full',
    concept_brief: { title: 'Neon Blades', idea: 'Cyberpunk parkour' },
    technical_warnings: [],
    completeness_score: 96,
    is_public: false,
    share_slug: null,
    template_id: null,
    moodboard_image_url: null,
    created_at: '2026-11-16T00:00:00Z',
    updated_at: '2026-11-16T00:00:00Z',
  };

  const sections: GddSectionRecord[] = [
    {
      id: 's1',
      project_id: 'p1',
      section_number: 1,
      section_key: 'document_info',
      title: '1. Informações do Documento',
      content_markdown: '- **Título:** Neon Blades',
      structured_data: {},
      review_status: 'approved',
      word_count: 4,
      is_optional: false,
    },
  ];

  const entities: GddEntityRecord[] = [
    {
      id: 'e1',
      project_id: 'p1',
      entity_type: 'roadmap_phase',
      name: 'Vertical Slice (MVP)',
      attributes: { Duração: '4 meses', Equipe: '5 pessoas' },
      sort_order: 0,
    },
  ];

  test('exports valid Markdown with YAML frontmatter and sections', () => {
    const md = exportProjectAsMarkdown(project, sections, entities);
    expect(md).toContain('completeness_score: 96');
    expect(md).toContain('# 1. Informações do Documento');
    expect(md).toContain('Vertical Slice (MVP)');
  });

  test('exports valid JSON bundle', () => {
    const raw = exportProjectAsJson(project, sections, entities, null);
    const parsed = JSON.parse(raw);
    expect(parsed.project.id).toBe('p1');
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.entities).toHaveLength(1);
  });

  test('exports RFC 4180 escaped CSV backlog', () => {
    const csv = exportRoadmapAsCsv(project, sections, entities);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Epic,Task,Category,Priority,EstimateOrDetails,Status');
    expect(lines[1]).toContain('"Neon Blades, ""Overdrive"" Roadmap"');
    expect(lines[1]).toContain('Vertical Slice (MVP)');
  });
});
