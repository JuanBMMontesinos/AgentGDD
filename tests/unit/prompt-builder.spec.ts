import { expect, test } from '@playwright/test';
import {
  buildMasterSystemInstruction,
  buildSectionRefinePrompt,
  buildStagePrompt,
  getGenerationStages,
} from '../../src/lib/gdd/prompt-builder';

test.describe('Prompt Builder Unit Tests', () => {
  test('includes multiplayer section 13 only when multiplayer is enabled', () => {
    const withMp = getGenerationStages(true);
    const withoutMp = getGenerationStages(false);

    expect(withMp[3].sectionNumbers).toContain(13);
    expect(withoutMp[3].sectionNumbers).not.toContain(13);
    expect(withoutMp[3].sectionNumbers).toContain(14);
    expect(withoutMp[3].sectionNumbers).toContain(15);
  });

  test('embeds mandatory Prompt-Agente-GDD-IA quality rules into system instruction', () => {
    const instruction = buildMasterSystemInstruction('pt-BR', 'full');
    expect(instruction).toContain('# N. Título da Seção');
    expect(instruction).toContain('#RRGGBB');
    expect(instruction).toContain('MVP vs Full Version');
    expect(instruction).toContain('mermaid');
  });

  test('builds stage prompt with conflict context and expected subsections', () => {
    const stages = getGenerationStages(false);
    const prompt = buildStagePrompt({
      brief: {
        title: 'Flat FPS',
        idea: 'Dungeon crawler 2D em primeira pessoa',
        dimensionality: '2D Puro',
        camera: 'Primeira Pessoa',
      },
      language: 'pt-BR',
      stage: stages[0],
      priorSummary: '',
    });

    expect(prompt).toContain('DIM_CAMERA_MISMATCH'.length > 0 ? 'Incompatibilidade entre Dimensionalidade 2D' : '');
    expect(prompt).toContain('1. Informações do Documento');
    expect(prompt).toContain('Paleta de Cores Principal');
  });

  test('builds section refine prompt keeping cross-section context', () => {
    const refinePrompt = buildSectionRefinePrompt({
      brief: { title: 'Test Game', idea: 'Roguelike tático' },
      sectionTitle: '7. Sistemas de Jogo',
      currentContent: 'Sistema de combate por turnos.',
      userInstruction: 'Adicione sistema de sinergia elemental.',
      crossSectionContext: 'Engine: Godot 4.3+, 2D Top-Down',
    });

    expect(refinePrompt).toContain('Godot 4.3+');
    expect(refinePrompt).toContain('Adicione sistema de sinergia elemental.');
  });
});
