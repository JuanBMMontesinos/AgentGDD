import { NextResponse } from 'next/server';
import { auditGddProject } from '@/lib/gdd/auditor';
import {
  countWords,
  extractEntitiesFromSections,
  parseSectionsFromMarkdown,
} from '@/lib/gdd/parser';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type {
  ConceptBrief,
  GddAuditReportRecord,
  GddCommentRecord,
  GddEntityRecord,
  GddProjectDetail,
  GddProjectRecord,
  GddSectionRecord,
  GddVersionRecord,
} from '@/types/gdd';

/**
 * Generates a URL-safe slug with a short random suffix to avoid collisions.
 */
export function slugifyTitle(title: string): string {
  const base = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || 'gdd-project'}-${suffix}`;
}

/**
 * Requires an authenticated Supabase user for protected API routes.
 */
export async function requireAuthenticatedContext() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      supabase,
      user: null,
      errorResponse: NextResponse.json(
        { error: 'Autenticação obrigatória. Faça login para acessar este recurso.' },
        { status: 401 }
      ),
    };
  }

  return { supabase, user, errorResponse: null };
}

/**
 * Loads the complete hydrated project graph (`project`, `sections`, `entities`, `versions`, `latestAudit`, `comments`).
 */
export async function hydrateProjectDetail(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  projectId: string
): Promise<GddProjectDetail | null> {
  const { data: project, error: projectErr } = await supabase
    .from('gdd_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  if (projectErr || !project) {
    return null;
  }

  const [sectionsRes, entitiesRes, versionsRes, auditsRes, commentsRes] = await Promise.all([
    supabase
      .from('gdd_sections')
      .select('*')
      .eq('project_id', projectId)
      .order('section_number', { ascending: true }),
    supabase
      .from('gdd_entities')
      .select('*')
      .eq('project_id', projectId)
      .order('entity_type', { ascending: true })
      .order('sort_order', { ascending: true }),
    supabase
      .from('gdd_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    supabase
      .from('gdd_audit_reports')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('gdd_comments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true }),
  ]);

  return {
    project: project as GddProjectRecord,
    sections: (sectionsRes.data ?? []) as GddSectionRecord[],
    entities: (entitiesRes.data ?? []) as GddEntityRecord[],
    versions: (versionsRes.data ?? []) as GddVersionRecord[],
    latestAudit: ((auditsRes.data ?? [])[0] ?? null) as GddAuditReportRecord | null,
    comments: (commentsRes.data ?? []) as GddCommentRecord[],
  };
}

/**
 * Upserts parsed Markdown sections from a generation stage.
 */
export async function persistStageOutput(params: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  projectId: string;
  markdown: string;
}) {
  const parsed = parseSectionsFromMarkdown(params.markdown);
  if (parsed.length === 0) return [];

  for (const sec of parsed) {
    const wordCount = countWords(sec.contentMarkdown);
    const { data: existing } = await params.supabase
      .from('gdd_sections')
      .select('id')
      .eq('project_id', params.projectId)
      .eq('section_number', sec.sectionNumber)
      .maybeSingle();

    if (existing) {
      await params.supabase
        .from('gdd_sections')
        .update({
          title: sec.title,
          content_markdown: sec.contentMarkdown,
          word_count: wordCount,
        })
        .eq('id', existing.id);
    } else {
      await params.supabase.from('gdd_sections').insert({
        project_id: params.projectId,
        section_number: sec.sectionNumber,
        section_key: `section_${sec.sectionNumber}`,
        title: sec.title,
        content_markdown: sec.contentMarkdown,
        word_count: wordCount,
        is_optional: sec.sectionNumber >= 13,
      });
    }
  }

  return parsed;
}

/**
 * Re-extracts structured entities across all current sections, runs the quality auditor,
 * and saves the updated score and audit report.
 */
export async function resyncEntitiesAndAudit(params: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  projectId: string;
  brief: ConceptBrief;
}) {
  const { data: allSections } = await params.supabase
    .from('gdd_sections')
    .select('section_number, title, content_markdown')
    .eq('project_id', params.projectId)
    .order('section_number', { ascending: true });

  const sections = (allSections ?? []) as Array<
    Pick<GddSectionRecord, 'section_number' | 'title' | 'content_markdown'>
  >;

  const extractedEntities = extractEntitiesFromSections(
    params.projectId,
    sections.map((s) => ({
      sectionNumber: s.section_number,
      contentMarkdown: s.content_markdown,
    }))
  );

  if (extractedEntities.length > 0) {
    await params.supabase.from('gdd_entities').delete().eq('project_id', params.projectId);
    await params.supabase.from('gdd_entities').insert(extractedEntities);
  }

  const audit = auditGddProject(params.brief, sections);

  await params.supabase
    .from('gdd_projects')
    .update({
      completeness_score: audit.overallScore,
      technical_warnings: audit.conflictsDetected,
    })
    .eq('id', params.projectId);

  const { data: savedAudit } = await params.supabase
    .from('gdd_audit_reports')
    .insert({
      project_id: params.projectId,
      overall_score: audit.overallScore,
      checklist_results: audit.checklistResults,
      conflicts_detected: audit.conflictsDetected,
      recommendations: audit.recommendations,
    })
    .select('*')
    .single();

  return {
    audit,
    savedAudit: savedAudit as GddAuditReportRecord | null,
    extractedCount: extractedEntities.length,
  };
}
