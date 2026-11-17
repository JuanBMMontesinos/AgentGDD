import { GoogleGenAI } from '@google/genai';
import {
  buildMasterSystemInstruction,
  buildSectionRefinePrompt,
  buildStagePrompt,
  type GenerationStageSpec,
} from '@/lib/gdd/prompt-builder';
import { generateMockStageMarkdown } from '@/lib/gdd/mock-generator';
import type { ConceptBrief, GddDepthMode, GddLanguage } from '@/types/gdd';

export type GeminiModelName = 'gemini-3.8-flash' | 'gemini-4-argon' | 'gemini-3.5-flash-lite';

const FALLBACK_CHAIN: Record<GeminiModelName, GeminiModelName[]> = {
  'gemini-4-argon': ['gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'],
  'gemini-3.8-flash': ['gemini-3.8-flash', 'gemini-3.5-flash-lite'],
  'gemini-3.5-flash-lite': ['gemini-3.5-flash-lite', 'gemini-3.8-flash'],
};

/**
 * Determines whether a Gemini API error is a transient overload/rate-limit error eligible for retry/fallback.
 */
export function isTransientGeminiError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /\b(429|500|502|503|504)\b|high demand|overloaded|temporar|unavailable|rate limit/i.test(
    message
  );
}

/**
 * Executes a Gemini interaction callback with automatic transient retry and model fallback chain.
 */
export async function withModelFallback<T>(
  primaryModel: GeminiModelName,
  executor: (model: GeminiModelName) => Promise<T>,
  delayMs = 800
): Promise<T> {
  const chain = FALLBACK_CHAIN[primaryModel] ?? [primaryModel];
  let lastError: unknown;

  for (let i = 0; i < chain.length; i += 1) {
    const model = chain[i];
    try {
      return await executor(model);
    } catch (err) {
      lastError = err;
      if (!isTransientGeminiError(err) || i === chain.length - 1) {
        throw err;
      }
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Resolves the Gemini API key from explicit BYOK header/input or server environment.
 */
function resolveApiKey(overrideApiKey?: string | null): string {
  const key = overrideApiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error('GEMINI_API_KEY não configurada no servidor nem fornecida na requisição.');
  }
  return key;
}

/**
 * Checks whether deterministic mock AI execution is requested for automated tests.
 */
export function shouldUseMockAi(requestHeaders?: Headers): boolean {
  if (process.env.E2E_MOCK_AI === '1') {
    return true;
  }
  if (process.env.NODE_ENV !== 'production' && requestHeaders?.get('x-mock-ai') === '1') {
    return true;
  }
  return false;
}

/**
 * Streams a single GDD generation stage using `@google/genai` `interactions.create`
 * (with `previous_interaction_id` chaining) or returns deterministic mock chunks in test mode.
 */
export async function generateGddStageStream(params: {
  brief: ConceptBrief;
  language: GddLanguage;
  depthMode: GddDepthMode;
  stage: GenerationStageSpec;
  priorSummary: string;
  previousInteractionId?: string;
  model?: GeminiModelName;
  overrideApiKey?: string | null;
  useMock?: boolean;
  onTextDelta?: (chunk: string) => void;
}): Promise<{ text: string; interactionId?: string }> {
  if (params.useMock) {
    const fullText = generateMockStageMarkdown(params.brief, params.stage.stageNumber);
    params.onTextDelta?.(fullText);
    return { text: fullText, interactionId: `mock-interaction-${params.stage.stageNumber}` };
  }

  const ai = new GoogleGenAI({ apiKey: resolveApiKey(params.overrideApiKey) });
  const primaryModel =
    params.model ?? (params.depthMode === 'full' ? 'gemini-3.8-flash' : 'gemini-3.5-flash-lite');

  const systemInstruction = buildMasterSystemInstruction(params.language, params.depthMode);
  const input = buildStagePrompt({
    brief: params.brief,
    language: params.language,
    stage: params.stage,
    priorSummary: params.priorSummary,
  });

  return withModelFallback(primaryModel, async (model) => {
    const stream = await ai.interactions.create({
      model,
      input,
      system_instruction: systemInstruction,
      ...(params.previousInteractionId && model === primaryModel
        ? { previous_interaction_id: params.previousInteractionId }
        : {}),
      stream: true,
    });

    let accumulated = '';
    let interactionId: string | undefined;

    for await (const event of stream) {
      if (event.event_type === 'interaction.created' && event.interaction?.id) {
        interactionId = event.interaction.id;
      } else if (event.event_type === 'step.delta' && event.delta?.type === 'text') {
        const piece = event.delta.text ?? '';
        if (piece) {
          accumulated += piece;
          params.onTextDelta?.(piece);
        }
      } else if (event.event_type === 'interaction.completed' && event.interaction?.id) {
        interactionId = event.interaction.id;
      }
    }

    return { text: accumulated, interactionId };
  });
}

/**
 * Refines or expands a single GDD section while maintaining cross-section consistency.
 */
export async function refineGddSection(params: {
  brief: ConceptBrief;
  language: GddLanguage;
  depthMode: GddDepthMode;
  sectionTitle: string;
  currentContent: string;
  userInstruction: string;
  crossSectionContext: string;
  overrideApiKey?: string | null;
  useMock?: boolean;
}): Promise<string> {
  if (params.useMock) {
    return `${params.currentContent.trim()}\n\n### Refinamento Aplicado (${new Date().toISOString().slice(0, 10)})\n- Ajuste solicitado: ${params.userInstruction}\n- Parâmetros revisados com foco em clareza numérica e implementação direta pela equipe.`;
  }

  const ai = new GoogleGenAI({ apiKey: resolveApiKey(params.overrideApiKey) });
  const systemInstruction = buildMasterSystemInstruction(params.language, params.depthMode);
  const input = buildSectionRefinePrompt({
    brief: params.brief,
    sectionTitle: params.sectionTitle,
    currentContent: params.currentContent,
    userInstruction: params.userInstruction,
    crossSectionContext: params.crossSectionContext,
  });

  const interaction = await withModelFallback('gemini-3.8-flash', (model) =>
    ai.interactions.create({
      model,
      input,
      system_instruction: systemInstruction,
    })
  );

  return interaction.output_text?.trim() || params.currentContent;
}

/**
 * Generates an optional concept-art moodboard image using `gemini-nano-banana-2.1`
 * grounded in Section 4's art direction and HEX color palette.
 */
export async function generateConceptMoodboard(params: {
  title: string;
  artDirectionSummary: string;
  hexColors: string[];
  overrideApiKey?: string | null;
  useMock?: boolean;
}): Promise<string> {
  if (params.useMock) {
    // 1x1 transparent PNG data URI placeholder for deterministic tests
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  const ai = new GoogleGenAI({ apiKey: resolveApiKey(params.overrideApiKey) });
  const paletteDesc = params.hexColors.length
    ? `Dominant color palette: ${params.hexColors.join(', ')}.`
    : '';

  const prompt = [
    `Create a cohesive game concept art moodboard sheet (no text labels) for a video game titled "${params.title}".`,
    paletteDesc,
    `Art direction notes: ${params.artDirectionSummary.slice(0, 900)}`,
  ]
    .filter(Boolean)
    .join(' ');

  const interaction = await ai.interactions.create({
    model: 'gemini-nano-banana-2.1',
    response_modalities: ['image'],
    input: prompt,
  });

  const img = interaction.output_image;
  if (!img?.data) {
    throw new Error('Modelo de imagem não retornou dados visuais.');
  }

  const mime = img.mime_type || 'image/png';
  return `data:${mime};base64,${img.data}`;
}
