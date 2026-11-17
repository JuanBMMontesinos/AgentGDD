import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedContext } from '@/lib/supabase/project-helpers';

const CreateVersionSchema = z.object({
  version_label: z.string().trim().min(1).max(32),
  changelog_note: z.string().trim().max(500).default('Snapshot manual'),
});

/**
 * Creates an immutable version snapshot of the current GDD sections and structured entities.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { supabase, user, errorResponse } = await requireAuthenticatedContext();
  if (errorResponse || !user) return errorResponse;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const parsed = CreateVersionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados de versão inválidos.', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: project } = await supabase
    .from('gdd_projects')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
  }

  const [{ data: sections }, { data: entities }] = await Promise.all([
    supabase
      .from('gdd_sections')
      .select('section_number, section_key, title, content_markdown, review_status')
      .eq('project_id', id)
      .order('section_number', { ascending: true }),
    supabase
      .from('gdd_entities')
      .select('entity_type, name, attributes, sort_order')
      .eq('project_id', id)
      .order('sort_order', { ascending: true }),
  ]);

  const { data: version, error } = await supabase
    .from('gdd_versions')
    .insert({
      project_id: id,
      version_label: parsed.data.version_label,
      changelog_note: parsed.data.changelog_note,
      snapshot: {
        version_label: parsed.data.version_label,
        sections: sections ?? [],
        entities: entities ?? [],
      },
      created_by: user.id,
    })
    .select('*')
    .single();

  if (error || !version) {
    return NextResponse.json({ error: error?.message || 'Falha ao salvar versão.' }, { status: 500 });
  }

  await supabase
    .from('gdd_projects')
    .update({ version_label: parsed.data.version_label })
    .eq('id', id);

  return NextResponse.json({ version }, { status: 201 });
}
