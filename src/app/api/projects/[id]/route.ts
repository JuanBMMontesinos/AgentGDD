import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  hydrateProjectDetail,
  requireAuthenticatedContext,
  slugifyTitle,
} from '@/lib/supabase/project-helpers';

const UpdateProjectSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  version_label: z.string().trim().min(1).max(32).optional(),
  status: z.string().trim().min(2).max(60).optional(),
  studio_name: z.string().trim().min(1).max(120).optional(),
  is_public: z.boolean().optional(),
});

/**
 * Fetches full hydrated detail for a single GDD project.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { supabase, user, errorResponse } = await requireAuthenticatedContext();
  if (errorResponse || !user) return errorResponse;

  const { id } = await context.params;
  const detail = await hydrateProjectDetail(supabase, id);

  if (!detail) {
    return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
  }

  return NextResponse.json(detail);
}

/**
 * Updates top-level project metadata and toggles public share link generation.
 */
export async function PATCH(
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
    return NextResponse.json({ error: 'Payload JSON inválido.' }, { status: 400 });
  }

  const parsed = UpdateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos.', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.is_public === true) {
    const { data: existing } = await supabase
      .from('gdd_projects')
      .select('title, share_slug')
      .eq('id', id)
      .single();
    if (existing && !existing.share_slug) {
      updates.share_slug = slugifyTitle(existing.title);
    }
  }

  const { data: updated, error } = await supabase
    .from('gdd_projects')
    .update(updates)
    .eq('id', id)
    .eq('owner_id', user.id)
    .select('*')
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message || 'Projeto não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ project: updated });
}

/**
 * Deletes an owned GDD project and cascades all child resources.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { supabase, user, errorResponse } = await requireAuthenticatedContext();
  if (errorResponse || !user) return errorResponse;

  const { id } = await context.params;
  const { error } = await supabase
    .from('gdd_projects')
    .delete()
    .eq('id', id)
    .eq('owner_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
