import { notFound } from 'next/navigation';
import { GddStudioWorkspace } from '@/components/GddStudioWorkspace';
import { Navbar } from '@/components/Navbar';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import type {
  GddAuditReportRecord,
  GddCommentRecord,
  GddEntityRecord,
  GddProjectDetail,
  GddProjectRecord,
  GddSectionRecord,
} from '@/types/gdd';

export const dynamic = 'force-dynamic';

/**
 * Public read-only view for shared Game Design Documents (`is_public = true`).
 */
export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminSupabaseClient();

  const { data: project } = await admin
    .from('gdd_projects')
    .select('*')
    .eq('share_slug', slug)
    .eq('is_public', true)
    .single();

  if (!project) {
    notFound();
  }

  const [sectionsRes, entitiesRes, auditsRes, commentsRes] = await Promise.all([
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
    admin
      .from('gdd_comments')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true }),
  ]);

  const detail: GddProjectDetail = {
    project: project as GddProjectRecord,
    sections: (sectionsRes.data ?? []) as GddSectionRecord[],
    entities: (entitiesRes.data ?? []) as GddEntityRecord[],
    versions: [],
    latestAudit: ((auditsRes.data ?? [])[0] ?? null) as GddAuditReportRecord | null,
    comments: (commentsRes.data ?? []) as GddCommentRecord[],
  };

  return (
    <div className="min-h-dvh">
      <Navbar />
      <main id="main-content">
        <GddStudioWorkspace initialDetail={detail} readOnly />
      </main>
    </div>
  );
}
