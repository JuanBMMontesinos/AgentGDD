import { expect, test } from '@playwright/test';
import { isTransientGeminiError, withModelFallback } from '../../src/lib/ai/gemini';

test.describe('Gemini Resilience Unit Tests', () => {
  test('recognizes transient 429/503 overload errors and rejects permanent auth errors', () => {
    expect(
      isTransientGeminiError(new Error('503 gemini-3.8-flash is currently experiencing high demand'))
    ).toBe(true);
    expect(isTransientGeminiError(new Error('429 rate limit exceeded'))).toBe(true);
    expect(isTransientGeminiError(new Error('401 API key invalid'))).toBe(false);
  });

  test('falls back from primary model to secondary model on transient 503', async () => {
    const attempts: string[] = [];

    const result = await withModelFallback(
      'gemini-3.8-flash',
      async (model) => {
        attempts.push(model);
        if (model === 'gemini-3.8-flash') {
          throw new Error('503 high demand');
        }
        return `ok:${model}`;
      },
      0
    );

    expect(result).toBe('ok:gemini-3.5-flash-lite');
    expect(attempts).toEqual(['gemini-3.8-flash', 'gemini-3.5-flash-lite']);
  });

  test('does not fallback on non-transient errors', async () => {
    const attempts: string[] = [];

    await expect(
      withModelFallback(
        'gemini-3.8-flash',
        async (model) => {
          attempts.push(model);
          throw new Error('400 invalid argument');
        },
        0
      )
    ).rejects.toThrow('400 invalid argument');

    expect(attempts).toEqual(['gemini-3.8-flash']);
  });
});
