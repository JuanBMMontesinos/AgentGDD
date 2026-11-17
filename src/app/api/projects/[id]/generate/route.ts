import { z } from 'zod';
import {
  generateGddStageStream,
  shouldUseMockAi,
  type GeminiModelName,
} from '@/lib/ai/gemini';
import { getGenerationStages } from '@/lib/gdd/prompt-builder';
import {
  persistStageOutput,
  requireAuthenticatedContext,
  resyncEntitiesAndAudit,
} from '@/lib/supabase/project-helpers';
import type { ConceptBrief, GddDepthMode, GddLanguage } from '@/types/gdd';

const GenerateRequestSchema = z
  .object({
    model: z.enum(['gemini-3.8-flash', 'gemini-4-argon', 'gemini-3.5-flash-lite']).optional(),
    apiKey: z.string().optional(),
  })
  .optional();

/**
 * Streams multi-stage GDD generation over Server-Sent Events (SSE), persisting
 * each stage to `gdd_sections`, extracting structured entities, and auditing quality.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { supabase, user, errorResponse } = await requireAuthenticatedContext();
  if (errorResponse || !user) return errorResponse;

  const { id } = await context.params;

  let body: unknown = {};
  try {
    const raw = await request.text();
    if (raw.trim()) body = JSON.parse(raw);
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido.' }), { status: 400 });
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Parâmetros inválidos.' }), { status: 400 });
  }

  const { data: project, error: projErr } = await supabase
    .from('gdd_projects')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (projErr || !project) {
    return new Response(JSON.stringify({ error: 'Projeto não encontrado.' }), { status: 404 });
  }

  const brief = (project.concept_brief ?? {}) as ConceptBrief;
  const language = (project.language ?? 'pt-BR') as GddLanguage;
  const depthMode = (project.depth_mode ?? 'full') as GddDepthMode;
  const stages = getGenerationStages(Boolean(brief.multiplayer));
  const useMock = shouldUseMockAi(request.headers);
  const selectedModel: GeminiModelName = parsed.data?.model ?? 'gemini-3.8-flash';
  const overrideApiKey = parsed.data?.apiKey || request.headers.get('x-gemini-api-key');

  const { data: job } = await supabase
    .from('gdd_generation_jobs')
    .insert({
      project_id: id,
      status: 'running',
      current_step: 0,
      total_steps: stages.length + 1,
      step_label: 'Iniciando orquestração...',
      model_used: selectedModel,
    })
    .select('id')
    .single();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        let priorSummary = '';
        let previousInteractionId: string | undefined;

        for (const stage of stages) {
          sendEvent('stage_start', {
            stageNumber: stage.stageNumber,
            totalStages: stages.length,
            label: stage.label,
            sectionNumbers: stage.sectionNumbers,
          });

          if (job?.id) {
            await supabase
              .from('gdd_generation_jobs')
              .update({
                current_step: stage.stageNumber,
                step_label: stage.label,
              })
              .eq('id', job.id);
          }

          const result = await generateGddStageStream({
            brief,
            language,
            depthMode,
            stage,
            priorSummary,
            previousInteractionId,
            model: selectedModel,
            overrideApiKey,
            useMock,
            onTextDelta: (chunk) => {
              sendEvent('text_delta', { stageNumber: stage.stageNumber, chunk });
            },
          });

          if (result.interactionId) {
            previousInteractionId = result.interactionId;
          }

          const savedSections = await persistStageOutput({
            supabase,
            projectId: id,
            markdown: result.text,
          });

          priorSummary += `\n### Resumo Estágio ${stage.stageNumber}\n${result.text.slice(0, 1800)}`;

          sendEvent('stage_saved', {
            stageNumber: stage.stageNumber,
            sectionsSaved: savedSections.map((s) => s.sectionNumber),
          });
        }

        const { audit, extractedCount } = await resyncEntitiesAndAudit({
          supabase,
          projectId: id,
          brief,
        });

        // Create initial version snapshot if none exists yet
        const { count: versionCount } = await supabase
          .from('gdd_versions')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', id);

        if (!versionCount || versionCount === 0) {
          const [{ data: secs }, { data: ents }] = await Promise.all([
            supabase
              .from('gdd_sections')
              .select('section_number, section_key, title, content_markdown, review_status')
              .eq('project_id', id)
              .order('section_number', { ascending: true }),
            supabase
              .from('gdd_entities')
              .select('entity_type, name, attributes, sort_order')
              .eq('project_id', id)
              .order('sort_order', { ascending: true }),
          ]);

          await supabase.from('gdd_versions').insert({
            project_id: id,
            version_label: project.version_label || 'v1.0',
            changelog_note: 'Geração inicial completa do GDD via AgentGDD.',
            snapshot: {
              version_label: project.version_label || 'v1.0',
              sections: secs ?? [],
              entities: ents ?? [],
            },
            created_by: user.id,
          });
        }

        if (job?.id) {
          await supabase
            .from('gdd_generation_jobs')
            .update({
              status: 'completed',
              current_step: stages.length + 1,
              step_label: 'Concluído e auditado',
              last_interaction_id: previousInteractionId ?? null,
            })
            .eq('id', job.id);
        }

        sendEvent('audit_complete', {
          overallScore: audit.overallScore,
          extractedEntities: extractedCount,
        });
        sendEvent('done', { projectId: id, overallScore: audit.overallScore });
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido na geração.';
        if (job?.id) {
          await supabase
            .from('gdd_generation_jobs')
            .update({ status: 'failed', error_message: message })
            .eq('id', job.id);
        }
        sendEvent('error', { message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
