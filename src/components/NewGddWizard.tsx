'use client';

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { detectTechnicalConflicts } from '@/lib/gdd/conflict-detector';
import type { ConceptBrief, GddDepthMode, GddLanguage, GddTemplateRecord } from '@/types/gdd';

interface NewGddWizardProps {
  templates: GddTemplateRecord[];
  initialTemplateSlug?: string;
}

const PLATFORM_OPTIONS = [
  'PC (Windows/Linux)',
  'PC (Mac)',
  'PS5',
  'Xbox Series X/S',
  'Nintendo Switch',
  'Mobile (iOS/Android)',
  'Web (HTML5/WebGL)',
];

const WIZARD_STEPS = [
  { step: 1, title: '1. Ideia & Template', desc: 'Ponto de partida e conceito central' },
  { step: 2, title: '2. Arquitetura & Escopo', desc: 'Engine, câmera, equipe e validações' },
  { step: 3, title: '3. Formato & Geração', desc: 'Idioma, profundidade e criação' },
] as const;

/**
 * 3-step progressive-disclosure GDD Creation Wizard on `/new` with preloaded template support
 * and real-time technical conflict warnings on Step 2.
 */
export function NewGddWizard({ templates, initialTemplateSlug }: NewGddWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [hydrated, setHydrated] = useState(false);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [studioName, setStudioName] = useState('Estúdio Independente');
  const [idea, setIdea] = useState('');
  const [genrePrimary, setGenrePrimary] = useState('Ação');
  const [genreSecondary, setGenreSecondary] = useState('Action RPG');
  const [engine, setEngine] = useState('Unity 2022 LTS+');
  const [dimensionality, setDimensionality] = useState('3D');
  const [camera, setCamera] = useState('Terceira Pessoa');
  const [teamSize, setTeamSize] = useState('Indie Pequena (3-6 pessoas)');
  const [targetAudience, setTargetAudience] = useState('Jogadores de 16-35 anos');
  const [inspirations, setInspirations] = useState('');
  const [monetization, setMonetization] = useState('Premium');
  const [platforms, setPlatforms] = useState<string[]>(['PC (Windows/Linux)']);
  const [multiplayer, setMultiplayer] = useState(false);
  const [language, setLanguage] = useState<GddLanguage>('pt-BR');
  const [depthMode, setDepthMode] = useState<GddDepthMode>('full');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (step === 3) {
      router.prefetch('/projects/00000000-0000-0000-0000-000000000000');
    }
  }, [router, step]);

  function applyTemplate(tpl: GddTemplateRecord) {
    setSelectedTemplateId(tpl.id);
    const b = tpl.default_brief;
    setTitle(b.title || tpl.name);
    setIdea(b.idea || '');
    setGenrePrimary(b.genrePrimary || tpl.genre_primary);
    setGenreSecondary(b.genreSecondary || tpl.genre_secondary || '');
    setEngine(b.engine || 'Unity 2022 LTS+');
    setDimensionality(b.dimensionality || '3D');
    setCamera(b.camera || 'Terceira Pessoa');
    setTeamSize(b.teamSize || 'Indie Pequena (3-6 pessoas)');
    setTargetAudience(b.targetAudience || 'Jogadores de 16-35 anos');
    setInspirations(b.inspirations || '');
    setMonetization(b.monetization || 'Premium');
    setPlatforms(b.platforms?.length ? b.platforms : ['PC (Windows/Linux)']);
    setMultiplayer(Boolean(b.multiplayer));
    setErrorMsg(null);
  }

  useEffect(() => {
    if (!initialTemplateSlug) return;
    const match = templates.find((t) => t.slug === initialTemplateSlug);
    if (match) {
      applyTemplate(match);
    }
  }, [initialTemplateSlug, templates]);

  const briefSnapshot: ConceptBrief = useMemo(
    () => ({
      title: title || 'Novo Jogo',
      idea,
      genrePrimary,
      genreSecondary,
      engine,
      dimensionality,
      camera,
      platforms,
      teamSize,
      targetAudience,
      inspirations,
      monetization,
      multiplayer,
      studioName,
    }),
    [
      title,
      idea,
      genrePrimary,
      genreSecondary,
      engine,
      dimensionality,
      camera,
      platforms,
      teamSize,
      targetAudience,
      inspirations,
      monetization,
      multiplayer,
      studioName,
    ]
  );

  const liveWarnings = useMemo(() => {
    if (!idea.trim()) return [];
    return detectTechnicalConflicts(briefSnapshot);
  }, [briefSnapshot, idea]);

  function togglePlatform(plat: string) {
    setPlatforms((prev) =>
      prev.includes(plat) ? prev.filter((p) => p !== plat) : [...prev, plat]
    );
  }

  function handleNextFromStep1() {
    setErrorMsg(null);
    if (title.trim().length < 2 || idea.trim().length < 10) {
      setErrorMsg(
        'Preencha um título (mín. 2 caracteres) e uma descrição da ideia (mín. 10 caracteres) antes de avançar.'
      );
      return;
    }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (title.trim().length < 2 || idea.trim().length < 10) {
      setErrorMsg('Informe um título (mín. 2 caracteres) e uma ideia detalhada (mín. 10 caracteres).');
      setStep(1);
      return;
    }

    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          studioName: studioName.trim(),
          language,
          depthMode,
          templateId: selectedTemplateId,
          conceptBrief: briefSnapshot,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Não foi possível criar o projeto.');
        setSubmitting(false);
        return;
      }

      const targetUrl = autoGenerate
        ? `/projects/${data.project.id}?autogen=1`
        : `/projects/${data.project.id}`;
      // Keep submitting=true until navigation unmounts this page to prevent double clicks.
      router.replace(targetUrl);
    } catch {
      setErrorMsg('Falha de rede ao criar o projeto.');
      setSubmitting(false);
    }
  }

  return (
    <section
      id="new-gdd-wizard"
      aria-labelledby="wizard-title"
      className="rounded-2xl border p-6 shadow-sm"
      style={{
        borderColor: 'var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <div className="mb-6">
        <h1 id="wizard-title" className="flex items-center gap-2 text-2xl font-extrabold">
          <Wand2 className="h-6 w-6" style={{ color: 'var(--brand)' }} aria-hidden="true" />
          Criar Novo Game Design Document
        </h1>
        <p className="mt-1 text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
          Siga os 3 passos rápidos para configurar o projeto antes de abrir o Studio GDD.
        </p>

        {/* Stepper Header */}
        <ol
          aria-label="Etapas de criação do GDD"
          className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {WIZARD_STEPS.map((item) => {
            const isCurrent = step === item.step;
            const isDone = step > item.step;
            return (
              <li
                key={item.step}
                aria-current={isCurrent ? 'step' : undefined}
                className="rounded-xl border p-3 transition"
                style={{
                  borderColor: isCurrent || isDone ? 'var(--brand)' : 'var(--border-subtle)',
                  backgroundColor: isCurrent ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-xs font-bold"
                    style={{ color: isCurrent || isDone ? 'var(--brand)' : 'var(--text-primary)' }}
                  >
                    {item.title}
                  </span>
                  {isDone && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                  )}
                </div>
                <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {item.desc}
                </p>
              </li>
            );
          })}
        </ol>
      </div>

      <form onSubmit={handleSubmit} data-hydrated={hydrated ? 'true' : 'false'} className="space-y-6">
        {/* STEP 1: Idea & Template */}
        {step === 1 && (
          <div className="space-y-5">
            {templates.length > 0 && (
              <div>
                <p
                  className="mb-2 text-xs font-bold uppercase tracking-wide"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Opcional: Começar a partir de um Template ({templates.length} gêneros)
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(null);
                      setTitle('');
                      setIdea('');
                    }}
                    className="min-h-8 rounded-lg border px-3 py-1.5 text-xs font-semibold"
                    style={{
                      borderColor: selectedTemplateId === null ? 'var(--brand)' : 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                    }}
                  >
                    Começar do Zero
                  </button>
                  {templates.map((tpl) => {
                    const active = selectedTemplateId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className="min-h-8 rounded-lg border px-3 py-1.5 text-xs font-medium transition"
                        style={{
                          borderColor: active ? 'var(--brand)' : 'var(--border-subtle)',
                          backgroundColor: active ? 'var(--brand)' : 'var(--bg-elevated)',
                          color: active ? 'var(--brand-contrast)' : 'var(--text-primary)',
                        }}
                      >
                        {tpl.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="gdd-title" className="mb-1 block text-xs font-semibold">
                  Título do Jogo *
                </label>
                <input
                  id="gdd-title"
                  type="text"
                  required
                  minLength={2}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Neon Blades: Overdrive Protocol"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
                />
              </div>

              <div>
                <label htmlFor="gdd-studio" className="mb-1 block text-xs font-semibold">
                  Estúdio / Desenvolvedora
                </label>
                <input
                  id="gdd-studio"
                  type="text"
                  value={studioName}
                  onChange={(e) => setStudioName(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="gdd-idea" className="mb-1 block text-xs font-semibold">
                Conceito / Ideia Principal do Jogo *
              </label>
              <textarea
                id="gdd-idea"
                required
                minLength={10}
                rows={4}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Descreva a fantasia principal, mecânicas centrais, atmosfera e público do jogo..."
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleNextFromStep1}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold"
                style={{
                  backgroundColor: 'var(--brand)',
                  color: 'var(--brand-contrast)',
                }}
              >
                <span>Avançar para Arquitetura</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Technical Architecture, Scope & Live Conflict Detector */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="gdd-genre-primary" className="mb-1 block text-xs font-semibold">
                  Gênero Primário
                </label>
                <select
                  id="gdd-genre-primary"
                  value={genrePrimary}
                  onChange={(e) => setGenrePrimary(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  <option value="Ação">Ação</option>
                  <option value="Aventura">Aventura</option>
                  <option value="RPG">RPG</option>
                  <option value="Strategy">Strategy / Roguelike</option>
                  <option value="Simulação">Simulação</option>
                  <option value="Puzzle">Puzzle</option>
                  <option value="Corrida">Corrida</option>
                  <option value="Esportes">Esportes / Luta</option>
                  <option value="Horror">Horror</option>
                  <option value="Indie">Indie Experimental</option>
                  <option value="Multijogador">Multijogador</option>
                </select>
              </div>

              <div>
                <label htmlFor="gdd-engine" className="mb-1 block text-xs font-semibold">
                  Engine Recomendada
                </label>
                <select
                  id="gdd-engine"
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  <option value="Unity 2022 LTS+">Unity 2022 LTS+</option>
                  <option value="Unreal Engine 5.4+">Unreal Engine 5.4+</option>
                  <option value="Godot 4.3+">Godot 4.3+</option>
                  <option value="GameMaker Studio 2">GameMaker Studio 2</option>
                  <option value="Custom / Phaser WebGL">Custom / Phaser WebGL</option>
                </select>
              </div>

              <div>
                <label htmlFor="gdd-dim" className="mb-1 block text-xs font-semibold">
                  Dimensionalidade
                </label>
                <select
                  id="gdd-dim"
                  value={dimensionality}
                  onChange={(e) => setDimensionality(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  <option value="3D">3D</option>
                  <option value="2.5D">2.5D</option>
                  <option value="2D Puro">2D Puro</option>
                </select>
              </div>

              <div>
                <label htmlFor="gdd-camera" className="mb-1 block text-xs font-semibold">
                  Perspectiva de Câmera
                </label>
                <select
                  id="gdd-camera"
                  value={camera}
                  onChange={(e) => setCamera(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  <option value="Terceira Pessoa">Terceira Pessoa</option>
                  <option value="Primeira Pessoa">Primeira Pessoa</option>
                  <option value="Top-down">Top-down</option>
                  <option value="Isométrica">Isométrica</option>
                  <option value="Side-scroll">Side-scroll</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="gdd-team" className="mb-1 block text-xs font-semibold">
                  Tamanho da Equipe
                </label>
                <select
                  id="gdd-team"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  <option value="Solo / Duo (1-2 pessoas)">Solo / Duo (1-2 pessoas)</option>
                  <option value="Indie Pequena (3-6 pessoas)">Indie Pequena (3-6 pessoas)</option>
                  <option value="Indie Média (7-15 pessoas)">Indie Média (7-15 pessoas)</option>
                  <option value="AA (15-40 pessoas)">AA (15-40 pessoas)</option>
                </select>
              </div>

              <div>
                <label htmlFor="gdd-inspirations" className="mb-1 block text-xs font-semibold">
                  Inspirações (Opcional)
                </label>
                <input
                  id="gdd-inspirations"
                  type="text"
                  value={inspirations}
                  onChange={(e) => setInspirations(e.target.value)}
                  placeholder="Ex: Hades, Hollow Knight, Ghostrunner"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
                />
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-semibold">Plataformas Alvo</span>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_OPTIONS.map((plat) => {
                  const checked = platforms.includes(plat);
                  return (
                    <label
                      key={plat}
                      className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1 text-xs"
                      style={{
                        borderColor: checked ? 'var(--brand)' : 'var(--border-subtle)',
                        backgroundColor: 'var(--bg-elevated)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePlatform(plat)}
                      />
                      <span>{plat}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {liveWarnings.length > 0 && (
              <div
                role="status"
                className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs"
              >
                <p className="flex items-center gap-1.5 font-bold text-amber-400">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  Detector de Conflitos Técnicos ({liveWarnings.length})
                </p>
                {liveWarnings.map((w) => (
                  <p key={w.code}>
                    <strong>{w.title}:</strong> {w.suggestion}
                  </p>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Voltar</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold"
                style={{
                  backgroundColor: 'var(--brand)',
                  color: 'var(--brand-contrast)',
                }}
              >
                <span>Avançar para Revisão</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Depth Mode, Language, Review & Submit */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="gdd-depth" className="mb-1 block text-xs font-semibold">
                  Profundidade de Geração
                </label>
                <select
                  id="gdd-depth"
                  value={depthMode}
                  onChange={(e) => setDepthMode(e.target.value as GddDepthMode)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  <option value="full">Bíblia Completa (12–15 Seções)</option>
                  <option value="mvp">MVP Enxuto & Direto</option>
                </select>
              </div>

              <div>
                <label htmlFor="gdd-lang" className="mb-1 block text-xs font-semibold">
                  Idioma do Documento
                </label>
                <select
                  id="gdd-lang"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as GddLanguage)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  <option value="pt-BR">Português (BR)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es">Español</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={multiplayer}
                  onChange={(e) => setMultiplayer(e.target.checked)}
                />
                <span>Incluir Seção 13 (Multiplayer, Netcode & LiveOps)</span>
              </label>

              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={autoGenerate}
                  onChange={(e) => setAutoGenerate(e.target.checked)}
                />
                <span>Iniciar geração automática por IA ao abrir o Studio</span>
              </label>
            </div>

            <div
              className="rounded-xl border p-4 text-xs"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-elevated)',
              }}
            >
              <p className="mb-2 font-bold uppercase tracking-wide" style={{ color: 'var(--brand)' }}>
                Resumo do Projeto
              </p>
              <p>
                <strong>{title}</strong> ({studioName}) · {genrePrimary} · {engine} ({dimensionality},{' '}
                {camera})
              </p>
              <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
                Plataformas: {platforms.join(', ') || 'Nenhuma selecionada'} · Equipe: {teamSize}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep(2)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold disabled:opacity-50"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Voltar</span>
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  backgroundColor: 'var(--brand)',
                  color: 'var(--brand-contrast)',
                }}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                )}
                <span>
                  {submitting
                    ? 'Criando e abrindo Studio GDD...'
                    : 'Criar & Abrir no Studio GDD'}
                </span>
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <p
            role="alert"
            className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-400"
          >
            {errorMsg}
          </p>
        )}
      </form>
    </section>
  );
}
