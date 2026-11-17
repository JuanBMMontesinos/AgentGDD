import { NextResponse } from 'next/server';
import { generateConceptMoodboard, shouldUseMockAi } from '@/lib/ai/gemini';
import { extractColorSwatches } from '@/lib/gdd/parser';
import { requireAuthenticatedContext } from '@/lib/supabase/project-helpers';

/**
 * Generates an AI concept-art moodboard image grounded in Section 4's art direction and HEX palette.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { supabase, user, errorResponse } = await requireAuthenticatedContext();
  if (errorResponse || !user) return errorResponse;

  const { id } = await context.params;
  const { data: project } = await supabase
    .from('gdd_projects')
    .select('id, title, concept_brief')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Projeto não encontrado.' }, { status: 404 });
  }

  const { data: sec4 } = await supabase
    .from('gdd_sections')
    .select('content_markdown')
    .eq('project_id', id)
    .eq('section_number', 4)
    .maybeSingle();

  const artText = sec4?.content_markdown || String(project.concept_brief?.idea ?? '');
  const hexColors = extractColorSwatches(artText).map((s) => s.hex);

  try {
    const moodboardDataUrl = await generateConceptMoodboard({
      title: project.title,
      artDirectionSummary: artText,
      hexColors,
      overrideApiKey: request.headers.get('x-gemini-api-key'),
      useMock: shouldUseMockAi(request.headers),
    });

    await supabase
      .from('gdd_projects')
      .update({ moodboard_image_url: moodboardDataUrl })
      .eq('id', id);

    return NextResponse.json({ moodboard_image_url: moodboardDataUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao gerar moodboard.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
