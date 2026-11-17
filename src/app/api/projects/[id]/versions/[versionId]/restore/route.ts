import { NextResponse } from 'next/server';
import { countWords } from '@/lib/gdd/parser';
import {
  requireAuthenticatedContext,
  resyncEntitiesAndAudit,
} from '@/lib/supabase/project-helpers';
import type { ConceptBrief, GddVersionRecord } from '@/types/gdd';

/**
 * Restores a GDD project's sections and entities from an immutable version snapshot.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; versionId: string }> }
) {
  const { supabase, user, errorResponse } = await requireAuthenticatedContext();
  if (errorResponse || !user) return errorResponse;

  const { id, versionId } = await context.params;

  const [{ data: project }, { data: versionRow }] = await Promise.all([
    supabase
      .from('gdd_projects')
      .select('id, concept_brief')
      .eq('id', id)
      .eq('owner_id', user.id)
      .single(),
    supabase
      .from('gdd_versions')
      .select('*')
      .eq('id', versionId)
      .eq('project_id', id)
      .single(),
  ]);

  if (!project || !versionRow) {
    return NextResponse.json({ error: 'Versão ou projeto não encontrado.' }, { status: 404 });
  }

  const snapshot = (versionRow as GddVersionRecord).snapshot;

  await supabase.from('gdd_sections').delete().eq('project_id', id);
  if (snapshot.sections?.length) {
    await supabase.from('gdd_sections').insert(
      snapshot.sections.map((s) => ({
        project_id: id,
        section_number: s.section_number,
        section_key: s.section_key,
        title: s.title,
        content_markdown: s.content_markdown,
        review_status: s.review_status,
        word_count: countWords(s.content_markdown),
        is_optional: s.section_number >= 13,
      }))
    );
  }

  await supabase.from('gdd_entities').delete().eq('project_id', id);
  if (snapshot.entities?.length) {
    await supabase.from('gdd_entities').insert(
      snapshot.entities.map((e) => ({
        project_id: id,
        entity_type: e.entity_type,
        name: e.name,
        attributes: e.attributes,
        sort_order: e.sort_order,
      }))
    );
  }

  await supabase
    .from('gdd_projects')
    .update({ version_label: snapshot.version_label })
    .eq('id', id);

  const { audit } = await resyncEntitiesAndAudit({
    supabase,
    projectId: id,
    brief: (project.concept_brief ?? {}) as ConceptBrief,
  });

  return NextResponse.json({
    restoredVersion: snapshot.version_label,
    overallScore: audit.overallScore,
  });
}
