import { NextResponse } from 'next/server';
import { z } from 'zod';
import { detectTechnicalConflicts } from '@/lib/gdd/conflict-detector';
import { getSectionDefinitions } from '@/lib/gdd/sections';
import {
  requireAuthenticatedContext,
  slugifyTitle,
} from '@/lib/supabase/project-helpers';

const CreateProjectSchema = z.object({
  title: z.string().trim().min(2).max(160),
  studioName: z.string().trim().max(120).optional(),
  language: z.enum(['pt-BR', 'en-US', 'es']).default('pt-BR'),
  depthMode: z.enum(['mvp', 'full']).default('full'),
  templateId: z.string().uuid().nullable().optional(),
  conceptBrief: z.object({
    title: z.string().trim().min(2),
    idea: z.string().trim().min(10, 'Descreva a ideia do jogo com pelo menos 10 caracteres.'),
    genrePrimary: z.string().optional(),
    genreSecondary: z.string().optional(),
    engine: z.string().optional(),
    dimensionality: z.string().optional(),
    camera: z.string().optional(),
    platforms: z.array(z.string()).optional(),
    teamSize: z.string().optional(),
    targetAudience: z.string().optional(),
    inspirations: z.string().optional(),
    monetization: z.string().optional(),
    multiplayer: z.boolean().optional(),
    studioName: z.string().optional(),
    targetBudget: z.string().optional(),
    targetTimeline: z.string().optional(),
  }),
});

/**
 * Lists all GDD projects owned by the authenticated user.
 */
export async function GET() {
  const { supabase, user, errorResponse } = await requireAuthenticatedContext();
  if (errorResponse || !user) return errorResponse;

  const { data, error } = await supabase
    .from('gdd_projects')
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: data ?? [] });
}

/**
 * Creates a new GDD project, performs technical conflict analysis, and seeds initial sections.
 */
export async function POST(request: Request) {
  const { supabase, user, errorResponse } = await requireAuthenticatedContext();
  if (errorResponse || !user) return errorResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload JSON inválido.' }, { status: 400 });
  }

  const parsed = CreateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados do projeto inválidos.', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const warnings = detectTechnicalConflicts(input.conceptBrief);
  const slug = slugifyTitle(input.title);

  const { data: project, error: insertError } = await supabase
    .from('gdd_projects')
    .insert({
      owner_id: user.id,
      title: input.title,
      slug,
      studio_name: input.studioName || input.conceptBrief.studioName || 'Estúdio Independente',
      language: input.language,
      depth_mode: input.depthMode,
      concept_brief: input.conceptBrief,
      technical_warnings: warnings,
      template_id: input.templateId ?? null,
    })
    .select('*')
    .single();

  if (insertError || !project) {
    return NextResponse.json(
      { error: insertError?.message || 'Erro ao criar projeto.' },
      { status: 500 }
    );
  }

  const defs = getSectionDefinitions(input.language, Boolean(input.conceptBrief.multiplayer));
  const initialSections = defs.map((d) => ({
    project_id: project.id,
    section_number: d.number,
    section_key: d.key,
    title: d.title,
    content_markdown: '',
    is_optional: d.optional,
    word_count: 0,
  }));

  await supabase.from('gdd_sections').insert(initialSections);

  return NextResponse.json({ project, warnings }, { status: 201 });
}
