import { z } from 'zod';
import {
  generateGddStageStream,
  shouldUseMockAi,
  type GeminiModelName,
} from '@/lib/ai/gemini';
import { getGenerationStages, getPendingStages } from '@/lib/gdd/prompt-builder';
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
    resumeOnlyMissing: z.boolean().optional(),
  })
  .optional();

/**
 * Streams multi-stage GDD generation over SSE with real-time stage status, heartbeats,
 * incremental Supabase persistence, partial resume support, and safe abort cancellation.
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
  const allStages = getGenerationStages(Boolean(brief.multiplayer));

  const { data: existingSections } = await supabase
    .from('gdd_sections')
    .select('section_number, title, content_markdown, word_count')
    .eq('project_id', id)
    .order('section_number', { ascending: true });

  const filledNums = (existingSections ?? [])
    .filter((s) => (s.word_count ?? 0) > 0)
    .map((s) => s.section_number as number);

  const stagesToRun = parsed.data?.resumeOnlyMissing
    ? getPendingStages(allStages, filledNums)
    : allStages;

  if (stagesToRun.length === 0) {
    return new Response(JSON.stringify({ error: 'Todas as seções já estão preenchidas.' }), {
      status: 400,
    });
  }

  const useMock = shouldUseMockAi(request.headers);
  const rawMockDelay = Number.parseInt(request.headers.get('x-mock-stage-delay-ms') || '0', 10);
  const mockDelayMs =
    useMock && Number.isFinite(rawMockDelay) && rawMockDelay > 0
      ? Math.min(rawMockDelay, 5000)
      : 0;
  const selectedModel: GeminiModelName = parsed.data?.model ?? 'gemini-3.8-flash';
  const overrideApiKey = parsed.data?.apiKey || request.headers.get('x-gemini-api-key');

  const { data: job } = await supabase
    .from('gdd_generation_jobs')
    .insert({
      project_id: id,
      status: 'running',
      current_step: 0,
      total_steps: stagesToRun.length + 1,
      step_label: 'Iniciando orquestração...',
      model_used: selectedModel,
    })
    .select('id')
    .single();

  const abortController = new AbortController();
  const handleRequestAbort = () => abortController.abort();
  request.signal.addEventListener('abort', handleRequestAbort);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let streamClosed = false;
      const sendEvent = (event: string, payload: unknown) => {
        if (streamClosed || abortController.signal.aborted) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
          );
        } catch {
          streamClosed = true;
        }
      };

      const closeStream = () => {
        if (streamClosed) return;
        streamClosed = true;
        try {
          controller.close();
        } catch {
          // Ignore already closed stream
        }
      };

      const checkDbCancelled = async () => {
        if (!job?.id) return false;
        const { data } = await supabase
          .from('gdd_generation_jobs')
          .select('status')
          .eq('id', job.id)
          .maybeSingle();
        return data?.status === 'cancelled';
      };

      try {
        let priorSummary = parsed.data?.resumeOnlyMissing
          ? (existingSections ?? [])
              .filter((s) => (s.word_count ?? 0) > 0)
              .map((s) => `## ${s.title}\n${String(s.content_markdown).slice(0, 400)}`)
              .join('\n\n')
          : '';
        let previousInteractionId: string | undefined;

        for (let idx = 0; idx < stagesToRun.length; idx += 1) {
          const stage = stagesToRun[idx];

          if (abortController.signal.aborted || (await checkDbCancelled())) {
            abortController.abort();
            throw new DOMException('Geração cancelada pelo usuário.', 'AbortError');
          }

          sendEvent('stage_start', {
            stageNumber: stage.stageNumber,
            stepIndex: idx + 1,
            totalStages: stagesToRun.length,
            label: stage.label,
            sectionNumbers: stage.sectionNumbers,
          });

          if (job?.id) {
            await supabase
              .from('gdd_generation_jobs')
              .update({
                current_step: idx + 1,
                step_label: stage.label,
              })
              .eq('id', job.id);
          }

          const stageStartedAt = Date.now();
          const heartbeat = setInterval(() => {
            sendEvent('stage_heartbeat', {
              stageNumber: stage.stageNumber,
              elapsedMs: Date.now() - stageStartedAt,
            });
          }, 2500);

          let result: { text: string; interactionId?: string };
          try {
            result = await generateGddStageStream({
              brief,
              language,
              depthMode,
              stage,
              priorSummary,
              previousInteractionId,
              model: selectedModel,
              overrideApiKey,
              useMock,
              mockDelayMs,
              abortSignal: abortController.signal,
              onStatus: (statusText) => {
                sendEvent('stage_status', {
                  stageNumber: stage.stageNumber,
                  statusText,
                });
              },
              onTextDelta: (chunk) => {
                sendEvent('text_delta', { stageNumber: stage.stageNumber, chunk });
              },
            });
          } finally {
            clearInterval(heartbeat);
          }

          if (abortController.signal.aborted || (await checkDbCancelled())) {
            abortController.abort();
            throw new DOMException('Geração cancelada pelo usuário.', 'AbortError');
          }

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
              current_step: stagesToRun.length + 1,
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
        closeStream();
      } catch (err) {
        const isAbort =
          abortController.signal.aborted ||
          (err instanceof Error && err.name === 'AbortError');

        if (isAbort) {
          const { audit } = await resyncEntitiesAndAudit({
            supabase,
            projectId: id,
            brief,
          });

          if (job?.id) {
            await supabase
              .from('gdd_generation_jobs')
              .update({
                status: 'cancelled',
                step_label: 'Cancelado pelo usuário (progresso parcial mantido)',
              })
              .eq('id', job.id);
          }

          sendEvent('cancelled', { overallScore: audit.overallScore });
          closeStream();
          return;
        }

        const message = err instanceof Error ? err.message : 'Erro desconhecido na geração.';
        if (job?.id) {
          await supabase
            .from('gdd_generation_jobs')
            .update({ status: 'failed', error_message: message })
            .eq('id', job.id);
        }
        sendEvent('error', { message });
        closeStream();
      } finally {
        request.signal.removeEventListener('abort', handleRequestAbort);
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
