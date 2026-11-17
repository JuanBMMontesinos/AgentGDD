import type { GddEntityRecord, GddEntityType } from '@/types/gdd';

export interface ParsedSectionChunk {
  sectionNumber: number;
  title: string;
  contentMarkdown: string;
}

export interface ParsedColorSwatch {
  name: string;
  hex: string;
  usage: string;
}

export interface ParsedMarkdownTable {
  headers: string[];
  rows: string[][];
}

/**
 * Counts words in Markdown content after stripping symbols.
 */
export function countWords(markdown: string): number {
  const cleaned = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_`>|[\]()-]/g, ' ')
    .trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

/**
 * Splits a full GDD Markdown document into discrete numbered sections (1..15).
 */
export function parseSectionsFromMarkdown(markdown: string): ParsedSectionChunk[] {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const headingRegex = /^#{1,3}\s+(?:\*\*)?(\d{1,2})\.\s+([^\n*]+?)(?:\*\*)?\s*$/gm;

  const matches: Array<{ index: number; sectionNumber: number; title: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(normalized)) !== null) {
    const sectionNumber = Number.parseInt(match[1], 10);
    if (sectionNumber >= 1 && sectionNumber <= 15) {
      matches.push({
        index: match.index,
        sectionNumber,
        title: `${sectionNumber}. ${match[2].trim()}`,
      });
    }
  }

  if (matches.length === 0) {
    return [];
  }

  const results: ParsedSectionChunk[] = [];
  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const next = matches[i + 1];
    const rawSlice = normalized.slice(current.index, next ? next.index : normalized.length).trim();

    // Strip the leading heading line so content_markdown holds section body cleanly
    const firstNewline = rawSlice.indexOf('\n');
    const body = firstNewline === -1 ? '' : rawSlice.slice(firstNewline + 1).trim();

    results.push({
      sectionNumber: current.sectionNumber,
      title: current.title,
      contentMarkdown: body,
    });
  }

  return results;
}

/**
 * Extracts Markdown pipe tables from a block of Markdown text.
 */
export function parseMarkdownTables(markdown: string): ParsedMarkdownTable[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const tables: ParsedMarkdownTable[] = [];

  let i = 0;
  while (i < lines.length) {
    const headerLine = lines[i]?.trim() ?? '';
    const separatorLine = lines[i + 1]?.trim() ?? '';

    if (
      headerLine.includes('|') &&
      /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(separatorLine)
    ) {
      const splitRow = (row: string): string[] =>
        row
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((cell) => cell.trim());

      const headers = splitRow(headerLine);
      const rows: string[][] = [];
      let j = i + 2;

      while (j < lines.length) {
        const line = lines[j]?.trim() ?? '';
        if (!line || !line.includes('|')) break;
        const cells = splitRow(line);
        if (cells.length >= 2) {
          rows.push(cells);
        }
        j += 1;
      }

      if (rows.length > 0) {
        tables.push({ headers, rows });
      }
      i = j;
      continue;
    }

    i += 1;
  }

  return tables;
}

/**
 * Extracts HEX color swatches from Markdown tables or inline HEX codes.
 */
export function extractColorSwatches(markdown: string): ParsedColorSwatch[] {
  const swatches: ParsedColorSwatch[] = [];
  const seenHex = new Set<string>();

  for (const table of parseMarkdownTables(markdown)) {
    const headerLower = table.headers.map((h) => h.toLowerCase());
    const hasColorCol = headerLower.some(
      (h) => h.includes('cor') || h.includes('color') || h.includes('hex')
    );

    if (!hasColorCol) continue;

    for (const row of table.rows) {
      const hexCellIndex = row.findIndex((cell) => /#[0-9A-Fa-f]{6}\b/.test(cell));
      if (hexCellIndex === -1) continue;

      const hexMatch = row[hexCellIndex].match(/#[0-9A-Fa-f]{6}\b/);
      if (!hexMatch) continue;
      const hex = hexMatch[0].toUpperCase();
      if (seenHex.has(hex)) continue;
      seenHex.add(hex);

      const name = row[0] && row[0] !== row[hexCellIndex] ? row[0] : `Cor ${swatches.length + 1}`;
      const usage =
        row.find((cell, idx) => idx !== 0 && idx !== hexCellIndex && cell.length > 0) ??
        'Paleta principal';

      swatches.push({ name: name.replace(/\*\*/g, ''), hex, usage });
    }
  }

  if (swatches.length === 0) {
    const fallbackMatches = markdown.match(/#[0-9A-Fa-f]{6}\b/g) ?? [];
    for (const rawHex of fallbackMatches) {
      const hex = rawHex.toUpperCase();
      if (seenHex.has(hex)) continue;
      seenHex.add(hex);
      swatches.push({
        name: `Cor ${swatches.length + 1}`,
        hex,
        usage: 'Extraída do documento',
      });
    }
  }

  return swatches;
}

/**
 * Computes accessible black or white foreground text color for a #RRGGBB background
 * per WCAG relative luminance contrast rules.
 */
export function getContrastTextColor(hex: string): '#000000' | '#FFFFFF' {
  const normalized = hex.replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) {
    return '#FFFFFF';
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  return luminance > 0.179 ? '#000000' : '#FFFFFF';
}

/**
 * Extracts structured game entities (enemies, bosses, equipment, skills, swatches, roadmap phases, risks)
 * from parsed GDD sections so they can populate interactive Studio tables.
 */
export function extractEntitiesFromSections(
  projectId: string,
  sections: Array<{ sectionNumber: number; contentMarkdown: string }>
): Array<Omit<GddEntityRecord, 'id' | 'created_at' | 'updated_at'>> {
  const entities: Array<Omit<GddEntityRecord, 'id' | 'created_at' | 'updated_at'>> = [];

  const pushEntity = (
    entityType: GddEntityType,
    name: string,
    attributes: Record<string, string | number | boolean | null>,
    sortOrder: number
  ) => {
    const cleanName = name.replace(/\*\*/g, '').trim();
    if (!cleanName || cleanName === '---') return;
    entities.push({
      project_id: projectId,
      entity_type: entityType,
      name: cleanName,
      attributes,
      sort_order: sortOrder,
    });
  };

  for (const section of sections) {
    if (section.sectionNumber === 4) {
      const swatches = extractColorSwatches(section.contentMarkdown);
      swatches.forEach((swatch, idx) => {
        pushEntity(
          'color_swatch',
          swatch.name,
          { hex: swatch.hex, usage: swatch.usage },
          idx
        );
      });
    }

    const tables = parseMarkdownTables(section.contentMarkdown);
    for (const table of tables) {
      const headerStr = table.headers.join(' ').toLowerCase();

      if (
        section.sectionNumber === 9 &&
        (headerStr.includes('vida') || headerStr.includes('hp') || headerStr.includes('dano') || headerStr.includes('loot'))
      ) {
        const isBossTable = headerStr.includes('fase') || headerStr.includes('phase') || headerStr.includes('boss');
        table.rows.forEach((row, idx) => {
          const attrs: Record<string, string> = {};
          table.headers.forEach((h, colIdx) => {
            attrs[h] = row[colIdx] ?? '';
          });
          pushEntity(isBossTable ? 'boss' : 'enemy', row[0] ?? `Enemy ${idx + 1}`, attrs, idx);
        });
      } else if (
        section.sectionNumber === 7 &&
        (headerStr.includes('raridade') || headerStr.includes('stats') || headerStr.includes('equip'))
      ) {
        table.rows.forEach((row, idx) => {
          const attrs: Record<string, string> = {};
          table.headers.forEach((h, colIdx) => {
            attrs[h] = row[colIdx] ?? '';
          });
          pushEntity('equipment', row[0] ?? `Item ${idx + 1}`, attrs, idx);
        });
      } else if (
        section.sectionNumber === 7 &&
        (headerStr.includes('cooldown') || headerStr.includes('custo') || headerStr.includes('efeito') || headerStr.includes('mana'))
      ) {
        table.rows.forEach((row, idx) => {
          const attrs: Record<string, string> = {};
          table.headers.forEach((h, colIdx) => {
            attrs[h] = row[colIdx] ?? '';
          });
          pushEntity('skill', row[0] ?? `Skill ${idx + 1}`, attrs, idx);
        });
      } else if (
        section.sectionNumber === 11 &&
        (headerStr.includes('fase') || headerStr.includes('phase') || headerStr.includes('duração') || headerStr.includes('entregável'))
      ) {
        table.rows.forEach((row, idx) => {
          const attrs: Record<string, string> = {};
          table.headers.forEach((h, colIdx) => {
            attrs[h] = row[colIdx] ?? '';
          });
          pushEntity('roadmap_phase', row[0] ?? `Fase ${idx + 1}`, attrs, idx);
        });
      } else if (
        section.sectionNumber === 15 &&
        (headerStr.includes('risco') || headerStr.includes('mitigação') || headerStr.includes('probabilidade'))
      ) {
        table.rows.forEach((row, idx) => {
          const attrs: Record<string, string> = {};
          table.headers.forEach((h, colIdx) => {
            attrs[h] = row[colIdx] ?? '';
          });
          pushEntity('risk_item', row[0] ?? `Risco ${idx + 1}`, attrs, idx);
        });
      } else if (
        section.sectionNumber === 15 &&
        (headerStr.includes('asset') || headerStr.includes('quantidade') || headerStr.includes('estimativa'))
      ) {
        table.rows.forEach((row, idx) => {
          const attrs: Record<string, string> = {};
          table.headers.forEach((h, colIdx) => {
            attrs[h] = row[colIdx] ?? '';
          });
          pushEntity('asset_estimate', row[0] ?? `Asset ${idx + 1}`, attrs, idx);
        });
      }
    }
  }

  return entities;
}
