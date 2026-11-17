import { expect, test } from '@playwright/test';
import { detectTechnicalConflicts } from '../../src/lib/gdd/conflict-detector';

test.describe('Conflict Detector Unit Tests', () => {
  test('flags critical scope inflation when solo team targets MMORPG/Open-World AAA', () => {
    const warnings = detectTechnicalConflicts({
      title: 'Aether Online',
      idea: 'Um MMORPG de mundo aberto AAA com 200 dungeons',
      teamSize: 'Solo / Duo (1-2 pessoas)',
      engine: 'Unreal Engine 5.4+',
    });

    expect(warnings.some((w) => w.code === 'SCOPE_SOLO_MASSIVE' && w.severity === 'critical')).toBe(
      true
    );
  });

  test('flags Unreal Engine + WebGL/HTML5 incompatibility', () => {
    const warnings = detectTechnicalConflicts({
      title: 'Browser Blast',
      idea: 'Shooter tático rápido',
      engine: 'Unreal Engine 5.4+',
      platforms: ['Web (HTML5/WebGL)', 'PC'],
    });

    expect(warnings.some((w) => w.code === 'ENGINE_UE5_WEB_CONFLICT')).toBe(true);
  });

  test('flags 2D dimensionality paired with First-Person camera', () => {
    const warnings = detectTechnicalConflicts({
      title: 'Flat FPS',
      idea: 'Dungeon crawler estilizado',
      dimensionality: '2D Puro',
      camera: 'Primeira Pessoa',
    });

    expect(warnings.some((w) => w.code === 'DIM_CAMERA_MISMATCH')).toBe(true);
  });

  test('recommends multiplayer module when concept text mentions co-op', () => {
    const warnings = detectTechnicalConflicts({
      title: 'Neon Duo',
      idea: 'Ação cooperativa online para 2-4 jogadores',
      multiplayer: false,
    });

    expect(warnings.some((w) => w.code === 'MULTIPLAYER_FLAG_RECOMMENDED')).toBe(true);
  });
});
