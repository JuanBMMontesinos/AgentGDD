import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedContext } from '@/lib/supabase/project-helpers';

const CreateCommentSchema = z.object({
  section_number: z.number().int().min(1).max(15),
  body: z.string().trim().min(1).max(2000),
});

const PatchCommentSchema = z.object({
  comment_id: z.string().uuid(),
  resolved: z.boolean(),
});

/**
 * Adds a review comment to a specific GDD section.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { supabase, user, errorResponse } = await requireAuthenticatedContext();
  if (errorResponse || !user) return errorResponse;

  const { id } = await context.params;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const parsed = CreateCommentSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Comentário inválido.' }, { status: 400 });
  }

  const { data: comment, error } = await supabase
    .from('gdd_comments')
    .insert({
      project_id: id,
      section_number: parsed.data.section_number,
      author_id: user.id,
      author_name: user.email || 'Designer',
      body: parsed.data.body,
    })
    .select('*')
    .single();

  if (error || !comment) {
    return NextResponse.json({ error: error?.message || 'Erro ao adicionar comentário.' }, { status: 500 });
  }

  return NextResponse.json({ comment }, { status: 201 });
}

/**
 * Toggles resolved state on a section comment.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { supabase, user, errorResponse } = await requireAuthenticatedContext();
  if (errorResponse || !user) return errorResponse;

  const { id } = await context.params;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const parsed = PatchCommentSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const { data: comment, error } = await supabase
    .from('gdd_comments')
    .update({ resolved: parsed.data.resolved })
    .eq('id', parsed.data.comment_id)
    .eq('project_id', id)
    .select('*')
    .single();

  if (error || !comment) {
    return NextResponse.json({ error: error?.message || 'Comentário não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ comment });
}
