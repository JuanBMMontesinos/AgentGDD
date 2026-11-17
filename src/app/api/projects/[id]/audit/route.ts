import { NextResponse } from 'next/server';
import {
  requireAuthenticatedContext,
  resyncEntitiesAndAudit,
} from '@/lib/supabase/project-helpers';
import type { ConceptBrief } from '@/types/gdd';

/**
 * Executes the automated 15-point Quality & Consistency Auditor on the project
 * and stores a new `gdd_audit_reports` row.
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

  const { audit, savedAudit, extractedCount } = await resyncEntitiesAndAudit({
    supabase,
    projectId: id,
    brief: (project.concept_brief ?? {}) as ConceptBrief,
  });

  return NextResponse.json({
    audit,
    savedAudit,
    extractedEntities: extractedCount,
  });
}
