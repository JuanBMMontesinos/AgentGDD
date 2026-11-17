import { NextResponse } from 'next/server';
import { z } from 'zod';
import { countWords } from '@/lib/gdd/parser';
import {
  requireAuthenticatedContext,
  resyncEntitiesAndAudit,
} from '@/lib/supabase/project-helpers';
import type { ConceptBrief } from '@/types/gdd';

const UpdateSectionSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  content_markdown: z.string().optional(),
  review_status: z.enum(['draft', 'in_review', 'approved']).optional(),
});

/**
 * Updates a single GDD section's Markdown body, title, or editorial review status,
 * then re-syncs extracted entities and quality score.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; sectionNumber: string }> }
) {
  const { supabase, user, errorResponse } = await requireAuthenticatedContext();
  if (errorResponse || !user) return errorResponse;

  const { id, sectionNumber } = await context.params;
  const num = Number.parseInt(sectionNumber, 10);
  if (!Number.isFinite(num) || num < 1 || num > 15) {
    return NextResponse.json({ error: 'Número de seção inválido (1–15).' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload JSON inválido.' }, { status: 400 });
  }

  const parsed = UpdateSectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados de seção inválidos.', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: project } = await supabase
    .from('gdd_projects')
    .select('id, concept_brief')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
  }

  const updates: Record<string, unknown> = { ...parsed.data };
  if (typeof parsed.data.content_markdown === 'string') {
    updates.word_count = countWords(parsed.data.content_markdown);
  }

  const { data: updated, error } = await supabase
    .from('gdd_sections')
    .update(updates)
    .eq('project_id', id)
    .eq('section_number', num)
    .select('*')
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message || 'Seção não encontrada.' }, { status: 404 });
  }

  const { audit } = await resyncEntitiesAndAudit({
    supabase,
    projectId: id,
    brief: (project.concept_brief ?? {}) as ConceptBrief,
  });

  return NextResponse.json({ section: updated, overallScore: audit.overallScore });
}
