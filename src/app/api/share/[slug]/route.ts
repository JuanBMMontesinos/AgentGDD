import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

/**
 * Serves read-only public GDD project details by `share_slug` when `is_public = true`.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const admin = createAdminSupabaseClient();

  const { data: project, error } = await admin
    .from('gdd_projects')
    .select('*')
    .eq('share_slug', slug)
    .eq('is_public', true)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: 'Documento público não encontrado.' }, { status: 404 });
  }

  const [sectionsRes, entitiesRes, auditsRes] = await Promise.all([
    admin
      .from('gdd_sections')
      .select('*')
      .eq('project_id', project.id)
      .order('section_number', { ascending: true }),
    admin
      .from('gdd_entities')
      .select('*')
      .eq('project_id', project.id)
      .order('entity_type', { ascending: true })
      .order('sort_order', { ascending: true }),
    admin
      .from('gdd_audit_reports')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  return NextResponse.json({
    project,
    sections: sectionsRes.data ?? [],
    entities: entitiesRes.data ?? [],
    latestAudit: (auditsRes.data ?? [])[0] ?? null,
  });
}
