import type {
  GddAuditReportRecord,
  GddEntityRecord,
  GddProjectRecord,
  GddSectionRecord,
} from '@/types/gdd';

/**
 * Escapes a single CSV field following RFC 4180.
 */
function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Builds a complete, standalone Markdown Project Bible from persisted project & sections.
 */
export function exportProjectAsMarkdown(
  project: GddProjectRecord,
  sections: GddSectionRecord[],
  entities: GddEntityRecord[]
): string {
  const sorted = [...sections].sort((a, b) => a.section_number - b.section_number);
  const header = [
    `---`,
    `title: "${project.title.replace(/"/g, '\\"')}"`,
    `version: "${project.version_label}"`,
    `status: "${project.status}"`,
    `studio: "${project.studio_name}"`,
    `language: "${project.language}"`,
    `completeness_score: ${project.completeness_score}`,
    `updated_at: "${project.updated_at}"`,
    `---`,
    ``,
    `# ${project.title} — Game Design Document (${project.version_label})`,
    ``,
    `> **Estúdio:** ${project.studio_name} | **Status:** ${project.status} | **Score de Qualidade:** ${project.completeness_score}%`,
    ``,
  ].join('\n');

  const body = sorted
    .map((section) => {
      const heading = section.title.startsWith(`${section.section_number}.`)
        ? `# ${section.title}`
        : `# ${section.section_number}. ${section.title}`;
      return `${heading}\n\n${section.content_markdown.trim()}`;
    })
    .join('\n\n---\n\n');

  const entityAppendix =
    entities.length > 0
      ? [
          `\n\n---\n\n## Apêndice Estruturado (Entidades Sincronizadas: ${entities.length})`,
          ...entities.map(
            (e) => `- **[${e.entity_type}] ${e.name}**: \`${JSON.stringify(e.attributes)}\``
          ),
        ].join('\n')
      : '';

  return `${header}\n${body}${entityAppendix}\n`;
}

/**
 * Exports full project bundle as formatted JSON for external integrations.
 */
export function exportProjectAsJson(
  project: GddProjectRecord,
  sections: GddSectionRecord[],
  entities: GddEntityRecord[],
  latestAudit: GddAuditReportRecord | null
): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      project,
      sections: [...sections].sort((a, b) => a.section_number - b.section_number),
      entities,
      latestAudit,
    },
    null,
    2
  );
}

/**
 * Generates a Jira/Linear/Trello-ready production backlog CSV from roadmap phases,
 * asset estimates, risks, and section deliverables.
 */
export function exportRoadmapAsCsv(
  project: GddProjectRecord,
  sections: GddSectionRecord[],
  entities: GddEntityRecord[]
): string {
  const rows: string[][] = [
    ['Epic', 'Task', 'Category', 'Priority', 'EstimateOrDetails', 'Status'],
  ];

  const roadmapEntities = entities.filter((e) => e.entity_type === 'roadmap_phase');
  const assetEntities = entities.filter((e) => e.entity_type === 'asset_estimate');
  const riskEntities = entities.filter((e) => e.entity_type === 'risk_item');

  for (const phase of roadmapEntities) {
    const attrText = Object.entries(phase.attributes)
      .map(([k, v]) => `${k}: ${v ?? ''}`)
      .join(' | ');
    rows.push([
      `${project.title} Roadmap`,
      phase.name,
      'Milestone / Phase',
      'High',
      attrText,
      'Todo',
    ]);
  }

  for (const asset of assetEntities) {
    const attrText = Object.entries(asset.attributes)
      .map(([k, v]) => `${k}: ${v ?? ''}`)
      .join(' | ');
    rows.push(['Art & Audio Production', asset.name, 'Asset Manifest', 'Medium', attrText, 'Todo']);
  }

  for (const risk of riskEntities) {
    const attrText = Object.entries(risk.attributes)
      .map(([k, v]) => `${k}: ${v ?? ''}`)
      .join(' | ');
    rows.push(['Risk Mitigation', risk.name, 'Technical Risk', 'High', attrText, 'Open']);
  }

  // Fallback: if no structured roadmap entities exist yet, create backlog epics per GDD section
  if (rows.length === 1) {
    for (const section of [...sections].sort((a, b) => a.section_number - b.section_number)) {
      rows.push([
        `${project.title} GDD Sign-off`,
        `Implementar & Validar: ${section.title}`,
        'GDD Section',
        section.section_number <= 12 ? 'High' : 'Medium',
        `${section.word_count} palavras`,
        section.review_status,
      ]);
    }
  }

  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}
