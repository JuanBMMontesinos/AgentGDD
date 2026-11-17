import { NextResponse } from 'next/server';
import {
  requireAuthenticatedContext,
  resyncEntitiesAndAudit,
} from '@/lib/supabase/project-helpers';
import type { ConceptBrief } from '@/types/gdd';

/**
 * Cancels any active generation job for an owned project while preserving and
 * re-auditing all already-completed sections.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { supabase, user, errorResponse } = await requireAuthenticatedContext();
  if (errorResponse || !user) return errorResponse;

  const { id } = await context.params;

  const { data: project } = await supabase
    .from('gdd_projects')
    .select('id, concept_brief')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
  }

  await supabase
    .from('gdd_generation_jobs')
    .update({
      status: 'cancelled',
      step_label: 'Cancelado pelo usuário (progresso parcial mantido)',
    })
    .eq('project_id', id)
    .in('status', ['queued', 'running']);

  const { audit } = await resyncEntitiesAndAudit({
    supabase,
    projectId: id,
    brief: (project.concept_brief ?? {}) as ConceptBrief,
  });

  return NextResponse.json({
    cancelled: true,
    overallScore: audit.overallScore,
  });
}
