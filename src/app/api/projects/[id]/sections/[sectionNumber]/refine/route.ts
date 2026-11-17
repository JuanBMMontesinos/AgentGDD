import { NextResponse } from 'next/server';
import { z } from 'zod';
import { refineGddSection, shouldUseMockAi } from '@/lib/ai/gemini';
import { countWords } from '@/lib/gdd/parser';
import {
  requireAuthenticatedContext,
  resyncEntitiesAndAudit,
} from '@/lib/supabase/project-helpers';
import type { ConceptBrief, GddDepthMode, GddLanguage } from '@/types/gdd';

const RefineSchema = z.object({
  instruction: z.string().trim().min(3, 'Informe uma instrução de refinamento.').max(1500),
  apiKey: z.string().optional(),
});

/**
 * Refines or expands one GDD section using Gemini AI while keeping cross-section coherence.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; sectionNumber: string }> }
) {
  const { supabase, user, errorResponse } = await requireAuthenticatedContext();
  if (errorResponse || !user) return errorResponse;

  const { id, sectionNumber } = await context.params;
  const num = Number.parseInt(sectionNumber, 10);
  if (!Number.isFinite(num) || num < 1 || num > 15) {
    return NextResponse.json({ error: 'Número de seção inválido.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const parsed = RefineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Instrução inválida.', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: project } = await supabase
    .from('gdd_projects')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
  }

  const { data: sections } = await supabase
    .from('gdd_sections')
    .select('*')
    .eq('project_id', id)
    .order('section_number', { ascending: true });

  const targetSection = (sections ?? []).find((s) => s.section_number === num);
  if (!targetSection) {
    return NextResponse.json({ error: 'Seção não encontrada.' }, { status: 404 });
  }

  const crossSectionContext = (sections ?? [])
    .filter((s) => s.section_number !== num && s.content_markdown)
    .slice(0, 6)
    .map((s) => `## ${s.title}\n${String(s.content_markdown).slice(0, 400)}`)
    .join('\n\n');

  const refinedMarkdown = await refineGddSection({
    brief: (project.concept_brief ?? {}) as ConceptBrief,
    language: (project.language ?? 'pt-BR') as GddLanguage,
    depthMode: (project.depth_mode ?? 'full') as GddDepthMode,
    sectionTitle: targetSection.title,
    currentContent: targetSection.content_markdown || '(Seção ainda vazia)',
    userInstruction: parsed.data.instruction,
    crossSectionContext,
    overrideApiKey: parsed.data.apiKey || request.headers.get('x-gemini-api-key'),
    useMock: shouldUseMockAi(request.headers),
  });

  const { data: updated, error } = await supabase
    .from('gdd_sections')
    .update({
      content_markdown: refinedMarkdown,
      word_count: countWords(refinedMarkdown),
    })
    .eq('id', targetSection.id)
    .select('*')
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message || 'Falha ao salvar seção.' }, { status: 500 });
  }

  const { audit } = await resyncEntitiesAndAudit({
    supabase,
    projectId: id,
    brief: (project.concept_brief ?? {}) as ConceptBrief,
  });

  return NextResponse.json({ section: updated, overallScore: audit.overallScore });
}
