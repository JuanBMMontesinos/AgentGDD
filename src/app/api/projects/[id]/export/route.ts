import { NextResponse } from 'next/server';
import {
  exportProjectAsJson,
  exportProjectAsMarkdown,
  exportRoadmapAsCsv,
} from '@/lib/gdd/exporters';
import {
  hydrateProjectDetail,
  requireAuthenticatedContext,
} from '@/lib/supabase/project-helpers';

/**
 * Exports a GDD project in Markdown (`.md`), structured JSON (`.json`), or Production Backlog CSV (`.csv`).
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { supabase, user, errorResponse } = await requireAuthenticatedContext();
  if (errorResponse || !user) return errorResponse;

  const { id } = await context.params;
  const format = new URL(request.url).searchParams.get('format') || 'md';

  const detail = await hydrateProjectDetail(supabase, id);
  if (!detail) {
    return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
  }

  const baseName = detail.project.slug || 'agentgdd-document';

  if (format === 'json') {
    const json = exportProjectAsJson(
      detail.project,
      detail.sections,
      detail.entities,
      detail.latestAudit
    );
    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseName}.json"`,
      },
    });
  }

  if (format === 'csv') {
    const csv = exportRoadmapAsCsv(detail.project, detail.sections, detail.entities);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${baseName}-backlog.csv"`,
      },
    });
  }

  const markdown = exportProjectAsMarkdown(detail.project, detail.sections, detail.entities);
  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${baseName}.md"`,
    },
  });
}
