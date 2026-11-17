import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedContext } from '@/lib/supabase/project-helpers';

const CreateEntitySchema = z.object({
  entity_type: z.enum([
    'enemy',
    'boss',
    'equipment',
    'skill',
    'color_swatch',
    'roadmap_phase',
    'risk_item',
    'asset_estimate',
  ]),
  name: z.string().trim().min(1).max(120),
  attributes: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
  sort_order: z.number().int().min(0).default(0),
});

/**
 * Adds a structured game entity (enemy, equipment, skill, swatch, roadmap phase, risk, asset)
 * to the project.
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

  const parsed = CreateEntitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Entidade inválida.', details: parsed.error.flatten() },
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

  const { data: entity, error } = await supabase
    .from('gdd_entities')
    .insert({
      project_id: id,
      ...parsed.data,
    })
    .select('*')
    .single();

  if (error || !entity) {
    return NextResponse.json({ error: error?.message || 'Falha ao inserir entidade.' }, { status: 500 });
  }

  return NextResponse.json({ entity }, { status: 201 });
}
