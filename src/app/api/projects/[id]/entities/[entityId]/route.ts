import { NextResponse } from 'next/server';
import { requireAuthenticatedContext } from '@/lib/supabase/project-helpers';

/**
 * Removes a single structured entity row from an owned project.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; entityId: string }> }
) {
  const { supabase, user, errorResponse } = await requireAuthenticatedContext();
  if (errorResponse || !user) return errorResponse;

  const { id, entityId } = await context.params;
  const { error } = await supabase
    .from('gdd_entities')
    .delete()
    .eq('id', entityId)
    .eq('project_id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
