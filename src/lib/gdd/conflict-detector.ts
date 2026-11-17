import type { ConceptBrief, TechnicalWarning } from '@/types/gdd';

/**
 * Evaluates a ConceptBrief for technical incompatibilities, scope inflation,
 * and architecture requirements before and after GDD generation.
 */
export function detectTechnicalConflicts(brief: ConceptBrief): TechnicalWarning[] {
  const warnings: TechnicalWarning[] = [];
  const textBlob = `${brief.idea} ${brief.genrePrimary ?? ''} ${brief.genreSecondary ?? ''}`.toLowerCase();
  const engine = (brief.engine ?? '').toLowerCase();
  const dimensionality = (brief.dimensionality ?? '').toLowerCase();
  const camera = (brief.camera ?? '').toLowerCase();
  const team = (brief.teamSize ?? '').toLowerCase();
  const platforms = (brief.platforms ?? []).map((p) => p.toLowerCase()).join(' ');
  const timeline = (brief.targetTimeline ?? '').toLowerCase();

  const isSoloOrTiny =
    team.includes('solo') || team.includes('duo') || team.includes('1-2') || team.includes('1 pessoa');
  const isMmoOrMassiveScope =
    textBlob.includes('mmorpg') ||
    textBlob.includes('mmo') ||
    textBlob.includes('mundo aberto aaa') ||
    textBlob.includes('open world aaa') ||
    textBlob.includes('battle royale 100');

  if (isSoloOrTiny && isMmoOrMassiveScope) {
    warnings.push({
      code: 'SCOPE_SOLO_MASSIVE',
      severity: 'critical',
      title: 'Conflito Crítico de Escopo vs. Equipe',
      detail:
        'O conceito combina escopo massivo (MMO/Open-World AAA/Battle Royale em larga escala) com equipe Solo/Duo.',
      suggestion:
        'Divida o projeto em um MVP Vertical Slice focado em 1 região fechada ou sessões co-op de 2-4 jogadores com geração procedural.',
    });
  }

  const targetsWeb = platforms.includes('web') || platforms.includes('html5') || platforms.includes('webgl');
  const targetsMobileOnly =
    (platforms.includes('ios') || platforms.includes('android') || platforms.includes('mobile')) &&
    !platforms.includes('pc') &&
    !platforms.includes('ps5');

  if (engine.includes('unreal') && targetsWeb) {
    warnings.push({
      code: 'ENGINE_UE5_WEB_CONFLICT',
      severity: 'critical',
      title: 'Unreal Engine 5 não possui suporte nativo oficial para WebGL/HTML5',
      detail:
        'Você selecionou plataformas Web/HTML5 junto com Unreal Engine, cujo suporte oficial para exportação Web foi descontinuado no UE5.',
      suggestion:
        'Migre para Godot 4.x ou Unity LTS (WebGL/WebGPU) caso Web seja prioridade, ou remova Web das plataformas alvo da UE5.',
    });
  }

  if (engine.includes('unreal') && targetsMobileOnly) {
    warnings.push({
      code: 'ENGINE_UE5_MOBILE_HEAVY',
      severity: 'warning',
      title: 'Unreal Engine 5 pode gerar build pesado para Mobile exclusivo',
      detail:
        'Builds mobile em UE5 possuem tamanho base elevado e maior exigência térmica/GPU em dispositivos intermediários.',
      suggestion:
        'Considere Unity 2022 LTS (URP) ou Godot 4 Mobile Renderer para builds leves e maior compatibilidade iOS/Android.',
    });
  }

  if (
    (dimensionality === '2d' || dimensionality.includes('2d puro')) &&
    (camera.includes('primeira pessoa') || camera.includes('first person') || camera.includes('terceira pessoa'))
  ) {
    warnings.push({
      code: 'DIM_CAMERA_MISMATCH',
      severity: 'warning',
      title: 'Incompatibilidade entre Dimensionalidade 2D e Câmera 3D',
      detail:
        `Dimensionalidade "${brief.dimensionality}" com perspectiva "${brief.camera}" gera ambiguidade técnica de pipeline de renderização.`,
      suggestion:
        'Ajuste a dimensionalidade para 2.5D/3D (caso deseje primeira/terceira pessoa) ou use perspectiva Top-down, Side-scroll ou Isométrica para 2D Puro.',
    });
  }

  const impliesMultiplayer =
    Boolean(brief.multiplayer) ||
    textBlob.includes('multiplayer') ||
    textBlob.includes('cooperativo') ||
    textBlob.includes('co-op') ||
    textBlob.includes('coop') ||
    textBlob.includes('pvp') ||
    textBlob.includes('moba');

  if (impliesMultiplayer && !brief.multiplayer) {
    warnings.push({
      code: 'MULTIPLAYER_FLAG_RECOMMENDED',
      severity: 'info',
      title: 'Mecânicas Online/Multiplayer detectadas no conceito',
      detail:
        'A descrição menciona multiplayer ou cooperação, portanto a Seção 13 (Netcode, Matchmaking & Anti-Cheat) deve permanecer ativa.',
      suggestion:
        'Ative o módulo de Multiplayer & LiveOps e defina topologia (Client-Server autoritativo vs P2P Relay) no GDD.',
    });
  }

  if (isSoloOrTiny && (timeline.includes('3 meses') || timeline.includes('6 meses')) && dimensionality.includes('3d')) {
    warnings.push({
      code: 'TIMELINE_3D_TIGHT',
      severity: 'warning',
      title: 'Prazo reduzido para produção 3D com equipe enxuta',
      detail:
        'Projetos 3D exigem pipeline de modelagem, rigging, shaders e iluminação que raramente cabem em menos de 6 meses para equipes solo/duo.',
      suggestion:
        'Priorize estilo Low-Poly/Stylized com kits modulares, defina claramente o escopo MVP na Seção 11 e reduza variação inicial de inimigos para 3-5 arquétipos.',
    });
  }

  return warnings;
}
