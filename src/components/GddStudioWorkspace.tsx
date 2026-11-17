'use client';

import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Download,
  Edit3,
  Eye,
  HelpCircle,
  History,
  Image as ImageIcon,
  Layers,
  Loader2,
  Lock,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Printer,
  RotateCcw,
  Save,
  Share2,
  Sparkles,
  Square,
  Unlock,
  Wand2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuditChecklistDialog } from '@/components/AuditChecklistDialog';
import { ColorPalettePanel } from '@/components/ColorPalettePanel';
import { EntityTableEditor } from '@/components/EntityTableEditor';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { getGenerationStages, getPendingStages } from '@/lib/gdd/prompt-builder';
import { getSectionDefinitionByNumber, getSectionGroups } from '@/lib/gdd/sections';
import type {
  GddProjectDetail,
  GddReviewStatus,
  GddSectionGroupId,
  GddSectionRecord,
} from '@/types/gdd';

interface GddStudioWorkspaceProps {
  initialDetail: GddProjectDetail;
  autoGenerateOnMount?: boolean;
  readOnly?: boolean;
}

type CenterView = 'section' | 'generating' | 'entities' | 'moodboard' | 'versions';
type SectionMode = 'read' | 'edit';
type AssistantTab = 'copilot' | 'comments';

/**
 * 3-zone GDD Studio Workspace with live multi-stage generation panel, progressive
 * section unlocking, conflict-prevention locks, and safe generation cancellation.
 */
export function GddStudioWorkspace({
  initialDetail,
  autoGenerateOnMount = false,
  readOnly = false,
}: GddStudioWorkspaceProps) {
  const [detail, setDetail] = useState<GddProjectDetail>(initialDetail);
  const [activeSectionNumber, setActiveSectionNumber] = useState<number>(
    initialDetail.sections.find((s) => s.word_count > 0)?.section_number ??
      initialDetail.sections[0]?.section_number ??
      1
  );
  const [centerView, setCenterView] = useState<CenterView>(
    autoGenerateOnMount ? 'generating' : 'section'
  );
  const [sectionMode, setSectionMode] = useState<SectionMode>('read');
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantTab, setAssistantTab] = useState<AssistantTab>('copilot');
  const [sectionTipOpen, setSectionTipOpen] = useState(true);
  const [manualUnlockAll, setManualUnlockAll] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<GddSectionGroupId, boolean>>({
    A: false,
    B: false,
    C: false,
    D: false,
  });

  const [exportOpen, setExportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [generateMenuOpen, setGenerateMenuOpen] = useState(false);

  const [editorText, setEditorText] = useState<string>(
    initialDetail.sections[0]?.content_markdown ?? ''
  );
  const [refineInstruction, setRefineInstruction] = useState('');
  const [newComment, setNewComment] = useState('');
  const [snapshotNote, setSnapshotNote] = useState('');
  const [snapshotVersion, setSnapshotVersion] = useState('v1.1');

  // Generation & cancellation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [activeStageNum, setActiveStageNum] = useState<number | null>(null);
  const [completedStageNums, setCompletedStageNums] = useState<number[]>([]);
  const [totalRunStages, setTotalRunStages] = useState<number>(4);
  const [liveStatusText, setLiveStatusText] = useState<string>('Aguardando início...');
  const [streamPreview, setStreamPreview] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const [isSaving, setIsSaving] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isGeneratingMoodboard, setIsGeneratingMoodboard] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<'gemini-3.8-flash' | 'gemini-4-argon'>(
    'gemini-3.8-flash'
  );

  const autoTriggeredRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const allStages = useMemo(
    () => getGenerationStages(Boolean(detail.project.concept_brief?.multiplayer)),
    [detail.project.concept_brief?.multiplayer]
  );

  const filledSectionNumbers = useMemo(
    () => detail.sections.filter((s) => s.word_count > 0).map((s) => s.section_number),
    [detail.sections]
  );

  const pendingStages = useMemo(
    () => getPendingStages(allStages, filledSectionNumbers),
    [allStages, filledSectionNumbers]
  );

  const activeStageSpec = useMemo(
    () => allStages.find((s) => s.stageNumber === activeStageNum),
    [allStages, activeStageNum]
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setExportOpen(false);
        setShareOpen(false);
        setGenerateMenuOpen(false);
      }
    }
    function handleClickOutside(e: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setExportOpen(false);
        setShareOpen(false);
        setGenerateMenuOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isGenerating) return;
    const startedAt = Date.now();
    setElapsedSeconds(0);
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const activeSection: GddSectionRecord | undefined = useMemo(
    () => detail.sections.find((s) => s.section_number === activeSectionNumber),
    [detail.sections, activeSectionNumber]
  );

  const activeSectionMeta = useMemo(
    () => getSectionDefinitionByNumber(activeSectionNumber, detail.project.language),
    [activeSectionNumber, detail.project.language]
  );

  const sectionGroups = useMemo(() => {
    const groups = getSectionGroups(detail.project.language, true);
    const byNum = new Map(detail.sections.map((s) => [s.section_number, s]));
    return groups
      .map((g) => ({
        ...g,
        items: g.sections
          .map((def) => byNum.get(def.number))
          .filter((item): item is GddSectionRecord => Boolean(item)),
      }))
      .filter((g) => g.items.length > 0);
  }, [detail.project.language, detail.sections]);

  const totalFilledSections = filledSectionNumbers.length;
  const hasPartialProgress =
    totalFilledSections > 0 && totalFilledSections < detail.sections.length;

  const progressPercent = useMemo(() => {
    if (!isGenerating) {
      return detail.sections.length > 0
        ? Math.round((totalFilledSections / detail.sections.length) * 100)
        : 0;
    }
    if (totalRunStages === 0) return 0;
    const base = Math.round((completedStageNums.length / totalRunStages) * 100);
    return Math.min(96, Math.max(base, activeStageNum ? 8 : 4));
  }, [
    isGenerating,
    totalFilledSections,
    detail.sections.length,
    completedStageNums.length,
    totalRunStages,
    activeStageNum,
  ]);

  const section4Markdown = useMemo(
    () => detail.sections.find((s) => s.section_number === 4)?.content_markdown ?? '',
    [detail.sections]
  );

  const sectionComments = useMemo(
    () => detail.comments.filter((c) => c.section_number === activeSectionNumber),
    [detail.comments, activeSectionNumber]
  );

  const refreshProject = useCallback(async (): Promise<GddProjectDetail | null> => {
    const res = await fetch(`/api/projects/${detail.project.id}`);
    if (res.ok) {
      const updated = (await res.json()) as GddProjectDetail;
      setDetail(updated);
      const current = updated.sections.find((s) => s.section_number === activeSectionNumber);
      if (current) {
        setEditorText(current.content_markdown);
      }
      return updated;
    }
    return null;
  }, [detail.project.id, activeSectionNumber]);

  function handleSelectSection(sec: GddSectionRecord) {
    setActiveSectionNumber(sec.section_number);
    setEditorText(sec.content_markdown);
    setSectionMode('read');
    setCenterView('section');
  }

  function toggleGroup(groupId: GddSectionGroupId) {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }

  const handleStartGeneration = useCallback(
    async (options?: { resumeOnlyMissing?: boolean }) => {
      if (isGenerating || readOnly) return;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setGenerateMenuOpen(false);
      setExportOpen(false);
      setShareOpen(false);
      setAssistantOpen(false);
      setCenterView('generating');
      setIsGenerating(true);
      setIsCancelling(false);
      setStreamPreview('');
      setActiveStageNum(null);
      setCompletedStageNums([]);
      setTotalRunStages(
        options?.resumeOnlyMissing ? Math.max(1, pendingStages.length) : allStages.length
      );
      setLiveStatusText('Conectando à orquestração Gemini AI...');
      setStatusBanner(null);

      try {
        const res = await fetch(`/api/projects/${detail.project.id}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            model: selectedModel,
            resumeOnlyMissing: Boolean(options?.resumeOnlyMissing),
          }),
        });

        if (!res.ok) {
          const errPayload = await res.json().catch(() => ({ error: 'Falha ao iniciar geração.' }));
          throw new Error(errPayload.error || `Erro HTTP ${res.status}`);
        }

        if (!res.body) {
          throw new Error('Resposta sem stream.');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';

          for (const frame of frames) {
            const eventMatch = frame.match(/^event:\s*(.+)$/m);
            const dataMatch = frame.match(/^data:\s*(.+)$/m);
            if (!eventMatch || !dataMatch) continue;

            const eventName = eventMatch[1].trim();
            const payload = JSON.parse(dataMatch[1]);

            if (eventName === 'stage_start') {
              setActiveStageNum(payload.stageNumber);
              setTotalRunStages(payload.totalStages ?? allStages.length);
              setLiveStatusText(`Estágio ${payload.stepIndex}/${payload.totalStages}: ${payload.label}`);
            } else if (eventName === 'stage_status') {
              setLiveStatusText(payload.statusText);
            } else if (eventName === 'text_delta') {
              setStreamPreview((prev) => `${prev}${payload.chunk}`.slice(-2200));
            } else if (eventName === 'stage_saved') {
              setCompletedStageNums((prev) =>
                prev.includes(payload.stageNumber) ? prev : [...prev, payload.stageNumber]
              );
              await refreshProject();
            } else if (eventName === 'cancelled') {
              await refreshProject();
              setStatusBanner(
                `Geração cancelada. As seções já concluídas foram preservadas (Score parcial: ${payload.overallScore}%).`
              );
              setCenterView('section');
            } else if (eventName === 'error') {
              setStatusBanner(`Erro na geração: ${payload.message}`);
            } else if (eventName === 'done') {
              const latest = await refreshProject();
              const firstFilled =
                latest?.sections.find((s) => s.word_count > 0)?.section_number ?? 1;
              setActiveSectionNumber(firstFilled);
              setCenterView('section');
              setStatusBanner(
                `GDD completo gerado e auditado! Score de Qualidade: ${payload.overallScore}%`
              );
            }
          }
        }
      } catch (err) {
        if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
          const updated = await refreshProject();
          const firstFilled = updated?.sections.find((s) => s.word_count > 0)?.section_number;
          if (firstFilled) setActiveSectionNumber(firstFilled);
          setCenterView('section');
          setStatusBanner(
            'Geração cancelada pelo usuário. Todas as seções já concluídas foram mantidas.'
          );
        } else {
          setStatusBanner(err instanceof Error ? err.message : 'Erro ao gerar GDD.');
          setCenterView('section');
        }
      } finally {
        abortControllerRef.current = null;
        setIsGenerating(false);
        setIsCancelling(false);
        setActiveStageNum(null);
      }
    },
    [
      allStages.length,
      detail.project.id,
      isGenerating,
      pendingStages.length,
      readOnly,
      refreshProject,
      selectedModel,
    ]
  );

  async function handleCancelGeneration() {
    if (!isGenerating || isCancelling) return;
    setIsCancelling(true);
    setLiveStatusText('Cancelando geração e preservando seções concluídas...');

    abortControllerRef.current?.abort();
    try {
      await fetch(`/api/projects/${detail.project.id}/generate/cancel`, {
        method: 'POST',
      });
    } catch {
      // Abort already closed client stream; refresh handles persisted state
    } finally {
      const updated = await refreshProject();
      const firstFilled = updated?.sections.find((s) => s.word_count > 0)?.section_number;
      if (firstFilled) setActiveSectionNumber(firstFilled);
      setIsGenerating(false);
      setIsCancelling(false);
      setCenterView('section');
      setStatusBanner(
        'Geração cancelada. As seções já concluídas foram preservadas no banco de dados.'
      );
    }
  }

  useEffect(() => {
    if (autoGenerateOnMount && !autoTriggeredRef.current && !readOnly) {
      autoTriggeredRef.current = true;
      void handleStartGeneration({ resumeOnlyMissing: false });
    }
  }, [autoGenerateOnMount, handleStartGeneration, readOnly]);

  async function handleSaveSection(newStatus?: GddReviewStatus) {
    if (!activeSection || readOnly || isGenerating) return;
    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/projects/${detail.project.id}/sections/${activeSection.section_number}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content_markdown: editorText,
            ...(newStatus ? { review_status: newStatus } : {}),
          }),
        }
      );
      if (res.ok) {
        await refreshProject();
        setSectionMode('read');
        setStatusBanner(`Seção ${activeSection.section_number} salva e auditada.`);
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRefineSection(instructionOverride?: string) {
    const promptText = instructionOverride ?? refineInstruction;
    if (!activeSection || !promptText.trim() || readOnly || isGenerating) return;

    setIsRefining(true);
    try {
      const res = await fetch(
        `/api/projects/${detail.project.id}/sections/${activeSection.section_number}/refine`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instruction: promptText }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setRefineInstruction('');
        await refreshProject();
        setCenterView('section');
        setSectionMode('read');
        setStatusBanner(
          `Seção ${activeSection.section_number} refinada com sucesso (Score: ${data.overallScore}%).`
        );
      } else {
        setStatusBanner(data.error || 'Falha ao refinar seção.');
      }
    } finally {
      setIsRefining(false);
    }
  }

  async function handleRunAudit() {
    if (isAuditing || isGenerating) return;
    setIsAuditing(true);
    setStatusBanner(null);
    try {
      const res = await fetch(`/api/projects/${detail.project.id}/audit`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setDetail((prev) => ({
          ...prev,
          project: {
            ...prev.project,
            completeness_score: data.audit?.overallScore ?? prev.project.completeness_score,
            technical_warnings:
              data.audit?.conflictsDetected ?? prev.project.technical_warnings,
          },
          latestAudit: data.savedAudit ?? prev.latestAudit,
        }));
        setAuditModalOpen(true);
      } else {
        setStatusBanner(data.error || 'Erro ao executar auditoria.');
      }
    } catch {
      setStatusBanner('Falha de rede ao executar auditoria.');
    } finally {
      setIsAuditing(false);
    }
  }

  async function handleCreateSnapshot(e: React.FormEvent) {
    e.preventDefault();
    if (!snapshotVersion.trim() || readOnly || isGenerating) return;
    const res = await fetch(`/api/projects/${detail.project.id}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version_label: snapshotVersion.trim(),
        changelog_note: snapshotNote.trim() || 'Snapshot salvo no Studio',
      }),
    });
    if (res.ok) {
      setSnapshotNote('');
      await refreshProject();
      setStatusBanner(`Snapshot ${snapshotVersion} salvo com sucesso.`);
    }
  }

  async function handleRestoreVersion(versionId: string) {
    if (readOnly || isGenerating) return;
    const res = await fetch(
      `/api/projects/${detail.project.id}/versions/${versionId}/restore`,
      { method: 'POST' }
    );
    if (res.ok) {
      await refreshProject();
      setStatusBanner('Versão restaurada com sucesso.');
    }
  }

  async function handleToggleShare() {
    if (readOnly || isGenerating) return;
    const nextPublic = !detail.project.is_public;
    const res = await fetch(`/api/projects/${detail.project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_public: nextPublic }),
    });
    if (res.ok) {
      await refreshProject();
      setStatusBanner(
        nextPublic ? 'Link público ativado!' : 'Compartilhamento público desativado.'
      );
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || readOnly || isGenerating) return;
    const res = await fetch(`/api/projects/${detail.project.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section_number: activeSectionNumber,
        body: newComment.trim(),
      }),
    });
    if (res.ok) {
      setNewComment('');
      await refreshProject();
    }
  }

  async function handleGenerateMoodboard() {
    if (readOnly || isGenerating) return;
    setIsGeneratingMoodboard(true);
    try {
      const res = await fetch(`/api/projects/${detail.project.id}/moodboard`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        await refreshProject();
        setCenterView('moodboard');
        setStatusBanner('Moodboard visual gerado com Gemini Nano Banana.');
      } else {
        setStatusBanner(data.error || 'Erro ao gerar moodboard.');
      }
    } finally {
      setIsGeneratingMoodboard(false);
    }
  }

  const shareUrl =
    detail.project.is_public && detail.project.share_slug
      ? `/share/${detail.project.share_slug}`
      : null;

  const isBlankProject = totalFilledSections === 0;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
      {/* Studio Top Bar */}
      <div
        ref={toolbarRef}
        className="no-print mb-5 rounded-2xl border p-4"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            {!readOnly && (
              <Link
                href="/"
                className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
                style={{ color: 'var(--text-muted)' }}
              >
                <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                <span>Meus Projetos</span>
              </Link>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                {detail.project.title}
              </h1>
              <span
                className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                {detail.project.version_label}
              </span>
              <button
                type="button"
                disabled={isGenerating || isAuditing}
                onClick={handleRunAudit}
                aria-label="Abrir auditoria de qualidade"
                className="rounded-full px-2.5 py-0.5 text-[11px] font-bold transition hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: 'var(--brand)', color: 'var(--brand-contrast)' }}
              >
                {isGenerating
                  ? `Progresso: ${totalFilledSections}/${detail.sections.length}`
                  : isAuditing
                    ? 'Auditando...'
                    : `Score: ${detail.project.completeness_score}%`}
              </button>
            </div>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              {detail.project.studio_name} · {totalFilledSections}/{detail.sections.length} seções
              concluídas · {detail.project.depth_mode === 'full' ? 'Bíblia Completa' : 'MVP'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!readOnly && (
              <>
                {isGenerating ? (
                  <>
                    {centerView !== 'generating' && (
                      <button
                        type="button"
                        onClick={() => setCenterView('generating')}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold"
                        style={{
                          borderColor: 'var(--brand)',
                          color: 'var(--brand)',
                          backgroundColor: 'var(--bg-elevated)',
                        }}
                      >
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        <span>Ver Painel Ao Vivo</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={handleCancelGeneration}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                      style={{ backgroundColor: 'var(--danger)' }}
                    >
                      <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      <span>{isCancelling ? 'Cancelando...' : 'Cancelar Geração'}</span>
                    </button>
                  </>
                ) : (
                  <div className="relative">
                    <div className="inline-flex">
                      {hasPartialProgress ? (
                        <button
                          type="button"
                          onClick={() => handleStartGeneration({ resumeOnlyMissing: true })}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-l-lg px-3.5 py-1.5 text-xs font-bold transition hover:opacity-90"
                          style={{
                            backgroundColor: 'var(--brand)',
                            color: 'var(--brand-contrast)',
                          }}
                        >
                          <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                          <span>Continuar Geração ({pendingStages.length} estágios)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartGeneration({ resumeOnlyMissing: false })}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-l-lg px-3.5 py-1.5 text-xs font-bold transition hover:opacity-90"
                          style={{
                            backgroundColor: 'var(--brand)',
                            color: 'var(--brand-contrast)',
                          }}
                        >
                          <Sparkles className="h-4 w-4" aria-hidden="true" />
                          <span>
                            {isBlankProject ? 'Gerar GDD Completo com IA' : 'Regenerar GDD'}
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Opções de geração e modelo Gemini"
                        aria-expanded={generateMenuOpen}
                        onClick={() => {
                          setGenerateMenuOpen((v) => !v);
                          setExportOpen(false);
                          setShareOpen(false);
                        }}
                        className="inline-flex min-h-9 items-center rounded-r-lg border-l border-black/15 px-2 text-xs font-bold"
                        style={{
                          backgroundColor: 'var(--brand)',
                          color: 'var(--brand-contrast)',
                        }}
                      >
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    {generateMenuOpen && (
                      <div
                        className="absolute right-0 top-full z-30 mt-1.5 w-64 space-y-3 rounded-xl border p-3 shadow-xl"
                        style={{
                          borderColor: 'var(--border-subtle)',
                          backgroundColor: 'var(--bg-surface)',
                        }}
                      >
                        <div>
                          <label htmlFor="model-select" className="mb-1.5 block text-xs font-bold">
                            Modelo Gemini
                          </label>
                          <select
                            id="model-select"
                            value={selectedModel}
                            onChange={(e) =>
                              setSelectedModel(
                                e.target.value as 'gemini-3.8-flash' | 'gemini-4-argon'
                              )
                            }
                            className="w-full rounded-lg border px-2.5 py-1.5 text-xs"
                            style={{
                              borderColor: 'var(--border-subtle)',
                              backgroundColor: 'var(--bg-elevated)',
                            }}
                          >
                            <option value="gemini-3.8-flash">Gemini 3.8 Flash (Rápido)</option>
                            <option value="gemini-4-argon">Gemini 4 Argon (Profundo)</option>
                          </select>
                        </div>
                        {hasPartialProgress && (
                          <button
                            type="button"
                            onClick={() => handleStartGeneration({ resumeOnlyMissing: false })}
                            className="w-full rounded-lg border px-3 py-1.5 text-xs font-semibold"
                            style={{
                              borderColor: 'var(--border-subtle)',
                              backgroundColor: 'var(--bg-elevated)',
                            }}
                          >
                            Regenerar Tudo do Zero
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRunAudit}
                  disabled={isAuditing || isGenerating}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                  }}
                >
                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                  <span>{isAuditing ? 'Auditando...' : 'Auditar Qualidade'}</span>
                </button>
              </>
            )}

            {/* Grouped Export Disclosure */}
            <div className="relative">
              <button
                type="button"
                disabled={isGenerating}
                aria-expanded={exportOpen}
                onClick={() => {
                  setExportOpen((v) => !v);
                  setShareOpen(false);
                  setGenerateMenuOpen(false);
                }}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Exportar</span>
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </button>

              {exportOpen && !isGenerating && (
                <div
                  className="absolute right-0 top-full z-30 mt-1.5 w-60 space-y-1 rounded-xl border p-2 shadow-xl"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                  }}
                >
                  <a
                    href={`/api/projects/${detail.project.id}/export?format=md`}
                    className="flex flex-col rounded-lg px-3 py-2 text-xs hover:opacity-80"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <span className="font-bold">Markdown (.MD)</span>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      Bíblia completa para Notion/GitHub
                    </span>
                  </a>
                  <a
                    href={`/api/projects/${detail.project.id}/export?format=csv`}
                    className="flex flex-col rounded-lg px-3 py-2 text-xs hover:opacity-80"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <span className="font-bold">CSV Backlog</span>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      Épicos e tarefas para Jira/Linear
                    </span>
                  </a>
                  <a
                    href={`/api/projects/${detail.project.id}/export?format=json`}
                    className="flex flex-col rounded-lg px-3 py-2 text-xs hover:opacity-80"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <span className="font-bold">JSON Estruturado</span>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      Dados e entidades para APIs
                    </span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setExportOpen(false);
                      window.print();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold hover:opacity-80"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>PDF / Imprimir Bíblia</span>
                  </button>
                </div>
              )}
            </div>

            {!readOnly && (
              <div className="relative">
                <button
                  type="button"
                  disabled={isGenerating}
                  aria-expanded={shareOpen}
                  onClick={() => {
                    setShareOpen((v) => !v);
                    setExportOpen(false);
                    setGenerateMenuOpen(false);
                  }}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                  style={{
                    borderColor: detail.project.is_public ? 'var(--brand)' : 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                  }}
                >
                  <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{detail.project.is_public ? 'Público' : 'Compartilhar'}</span>
                </button>

                {shareOpen && !isGenerating && (
                  <div
                    className="absolute right-0 top-full z-30 mt-1.5 w-72 space-y-3 rounded-xl border p-3.5 shadow-xl"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold">Link Público Somente Leitura</span>
                      <button
                        type="button"
                        onClick={handleToggleShare}
                        className="rounded-lg px-2.5 py-1 text-[11px] font-bold"
                        style={{
                          backgroundColor: 'var(--brand)',
                          color: 'var(--brand-contrast)',
                        }}
                      >
                        {detail.project.is_public ? 'Desativar' : 'Ativar Link Público'}
                      </button>
                    </div>
                    {shareUrl ? (
                      <div
                        className="rounded-lg border p-2 text-xs"
                        style={{
                          borderColor: 'var(--border-subtle)',
                          backgroundColor: 'var(--bg-elevated)',
                        }}
                      >
                        <a
                          href={shareUrl}
                          className="break-all font-semibold underline"
                          style={{ color: 'var(--brand)' }}
                        >
                          {shareUrl}
                        </a>
                      </div>
                    ) : (
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        Ative para gerar uma URL de leitura sem exigir login.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {!readOnly && (
              <button
                type="button"
                disabled={isGenerating}
                aria-expanded={assistantOpen}
                onClick={() => setAssistantOpen((v) => !v)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                style={{
                  borderColor: assistantOpen ? 'var(--brand)' : 'var(--border-subtle)',
                  backgroundColor: assistantOpen ? 'var(--brand)' : 'var(--bg-elevated)',
                  color: assistantOpen ? 'var(--brand-contrast)' : 'var(--text-primary)',
                }}
              >
                {assistantOpen ? (
                  <PanelRightClose className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
                )}
                <span>Copiloto & Notas</span>
              </button>
            )}
          </div>
        </div>

        {statusBanner && (
          <p
            role="status"
            className="mt-3 rounded-lg border px-3 py-2 text-xs font-medium"
            style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
          >
            {statusBanner}
          </p>
        )}
      </div>

      {/* 3-Zone Studio Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left Navigation: Progressive Section Locking + Global Tools */}
        <aside className="no-print lg:col-span-3">
          <div
            className="studio-scroll max-h-[78dvh] space-y-4 overflow-y-auto rounded-2xl border p-3"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <nav aria-label="Seções do GDD" className="space-y-2.5">
              <div className="flex items-center justify-between px-2">
                <p
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Seções ({totalFilledSections}/{detail.sections.length})
                </p>
                {!isGenerating && !readOnly && totalFilledSections < detail.sections.length && (
                  <button
                    type="button"
                    onClick={() => setManualUnlockAll((v) => !v)}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold underline"
                    style={{ color: 'var(--brand)' }}
                  >
                    {manualUnlockAll ? (
                      <>
                        <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                        <span>Travar vazias</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="h-2.5 w-2.5" aria-hidden="true" />
                        <span>Editar vazias</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {sectionGroups.map((group) => {
                const isCollapsed = collapsedGroups[group.id];
                return (
                  <div key={group.id} className="space-y-1">
                    <button
                      type="button"
                      aria-expanded={!isCollapsed}
                      onClick={() => toggleGroup(group.id)}
                      className="flex w-full items-center justify-between gap-1 rounded-lg px-2 py-1.5 text-left text-[11px] font-bold"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span className="truncate">{group.label}</span>
                      {isCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      )}
                    </button>

                    {!isCollapsed && (
                      <div className="space-y-0.5 pl-1">
                        {group.items.map((sec) => {
                          const selected =
                            centerView === 'section' && sec.section_number === activeSectionNumber;
                          const isApproved = sec.review_status === 'approved';
                          const isFilled = sec.word_count > 0;
                          const isInCurrentGeneratingStage =
                            isGenerating &&
                            Boolean(activeStageSpec?.sectionNumbers.includes(sec.section_number));
                          const isLocked = isGenerating
                            ? !isFilled
                            : !isFilled && !manualUnlockAll && !readOnly;

                          return (
                            <button
                              key={sec.id}
                              type="button"
                              disabled={isLocked}
                              onClick={() => handleSelectSection(sec)}
                              title={
                                isInCurrentGeneratingStage
                                  ? 'Gerando esta seção com IA agora...'
                                  : isLocked
                                    ? 'Seção aguardando geração pela IA'
                                    : sec.title
                              }
                              className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-50"
                              style={{
                                backgroundColor: selected ? 'var(--brand)' : 'transparent',
                                color: selected ? 'var(--brand-contrast)' : 'var(--text-primary)',
                              }}
                            >
                              <span className="flex min-w-0 items-center gap-1.5">
                                {isInCurrentGeneratingStage ? (
                                  <Loader2
                                    className="h-3.5 w-3.5 shrink-0 animate-spin"
                                    style={{ color: 'var(--brand)' }}
                                    aria-hidden="true"
                                  />
                                ) : isApproved ? (
                                  <CheckCircle2
                                    className="h-3.5 w-3.5 shrink-0 text-emerald-400"
                                    aria-hidden="true"
                                  />
                                ) : isFilled ? (
                                  <CircleDot
                                    className="h-3.5 w-3.5 shrink-0 text-emerald-400"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Lock
                                    className="h-3.5 w-3.5 shrink-0 opacity-60"
                                    aria-hidden="true"
                                  />
                                )}
                                <span className="truncate font-medium">{sec.title}</span>
                              </span>
                              <span className="shrink-0 text-[10px] opacity-75">
                                {isInCurrentGeneratingStage
                                  ? 'gerando'
                                  : isFilled
                                    ? `${sec.word_count}w`
                                    : 'bloqueada'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <p
                className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Ferramentas do Projeto
              </p>
              <div className="space-y-1">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setCenterView('entities')}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                  style={{
                    backgroundColor: centerView === 'entities' ? 'var(--brand)' : 'transparent',
                    color:
                      centerView === 'entities' ? 'var(--brand-contrast)' : 'var(--text-primary)',
                  }}
                >
                  <Layers className="h-4 w-4" aria-hidden="true" />
                  <span>Tabelas ({detail.entities.length})</span>
                </button>

                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setCenterView('moodboard')}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                  style={{
                    backgroundColor: centerView === 'moodboard' ? 'var(--brand)' : 'transparent',
                    color:
                      centerView === 'moodboard' ? 'var(--brand-contrast)' : 'var(--text-primary)',
                  }}
                >
                  <ImageIcon className="h-4 w-4" aria-hidden="true" />
                  <span>Moodboard Visual</span>
                </button>

                {!readOnly && (
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setCenterView('versions')}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                    style={{
                      backgroundColor: centerView === 'versions' ? 'var(--brand)' : 'transparent',
                      color:
                        centerView === 'versions'
                          ? 'var(--brand-contrast)'
                          : 'var(--text-primary)',
                    }}
                  >
                    <History className="h-4 w-4" aria-hidden="true" />
                    <span>Versões ({detail.versions.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Center Workspace */}
        <section
          className={`min-w-0 space-y-4 ${
            assistantOpen && !readOnly && !isGenerating ? 'lg:col-span-6' : 'lg:col-span-9'
          }`}
        >
          {/* Dedicated Live Generation Panel */}
          {centerView === 'generating' && (
            <div
              aria-live="polite"
              className="space-y-5 rounded-2xl border p-6"
              style={{
                borderColor: 'var(--brand)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Loader2
                      className="h-5 w-5 animate-spin"
                      style={{ color: 'var(--brand)' }}
                      aria-hidden="true"
                    />
                    <h2 className="text-xl font-extrabold">
                      Gerando seu Game Design Document
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                    {liveStatusText} · Tempo decorrido: <strong>{elapsedSeconds}s</strong>
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={handleCancelGeneration}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: 'var(--danger)' }}
                >
                  <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  <span>
                    {isCancelling
                      ? 'Cancelando...'
                      : 'Cancelar e Manter Seções Concluídas'}
                  </span>
                </button>
              </div>

              {/* Semantic Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Progresso Geral</span>
                  <span>{progressPercent}%</span>
                </div>
                <progress
                  value={progressPercent}
                  max={100}
                  aria-label="Progresso da geração do GDD"
                  className="h-3 w-full overflow-hidden rounded-full"
                />
              </div>

              {/* Stage-by-Stage Checklist */}
              <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {allStages.map((stage) => {
                  const isDone = completedStageNums.includes(stage.stageNumber);
                  const isActive = activeStageNum === stage.stageNumber;
                  return (
                    <li
                      key={stage.stageNumber}
                      className="flex items-start gap-2.5 rounded-xl border p-3 text-xs"
                      style={{
                        borderColor: isActive || isDone ? 'var(--brand)' : 'var(--border-subtle)',
                        backgroundColor: 'var(--bg-elevated)',
                      }}
                    >
                      {isDone ? (
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                          aria-hidden="true"
                        />
                      ) : isActive ? (
                        <Loader2
                          className="mt-0.5 h-4 w-4 shrink-0 animate-spin"
                          style={{ color: 'var(--brand)' }}
                          aria-hidden="true"
                        />
                      ) : (
                        <Lock
                          className="mt-0.5 h-4 w-4 shrink-0 opacity-50"
                          aria-hidden="true"
                        />
                      )}
                      <div>
                        <p className="font-bold">Estágio {stage.stageNumber}</p>
                        <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {stage.label}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {/* Live Streaming Output Preview */}
              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                <p
                  className="mb-2 text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Prévia em Tempo Real (As seções concluídas são liberadas à esquerda)
                </p>
                <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">
                  {streamPreview || 'Aguardando os primeiros tokens da Gemini AI...'}
                </pre>
              </div>
            </div>
          )}

          {centerView === 'section' && activeSection && (
            <div
              className="rounded-2xl border p-6"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              {/* Section Header & Local Mode Switch */}
              <div
                className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">{activeSection.title}</h2>
                  <button
                    type="button"
                    onClick={() => setSectionTipOpen((v) => !v)}
                    aria-expanded={sectionTipOpen}
                    aria-label="Alternar dica desta seção"
                    className="no-print inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <HelpCircle className="h-3 w-3" aria-hidden="true" />
                    <span>Guia da seção</span>
                  </button>
                </div>

                {!readOnly && (
                  <div className="no-print flex flex-wrap items-center gap-2">
                    <div
                      role="tablist"
                      aria-label="Modo da seção"
                      className="inline-flex rounded-lg border p-0.5"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        backgroundColor: 'var(--bg-elevated)',
                      }}
                    >
                      <button
                        type="button"
                        role="tab"
                        disabled={isGenerating}
                        aria-selected={sectionMode === 'read'}
                        onClick={() => setSectionMode('read')}
                        className="inline-flex min-h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold disabled:opacity-50"
                        style={{
                          backgroundColor:
                            sectionMode === 'read' ? 'var(--brand)' : 'transparent',
                          color:
                            sectionMode === 'read' ? 'var(--brand-contrast)' : 'var(--text-primary)',
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Leitura</span>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        disabled={isGenerating}
                        aria-selected={sectionMode === 'edit'}
                        onClick={() => setSectionMode('edit')}
                        className="inline-flex min-h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold disabled:opacity-50"
                        style={{
                          backgroundColor:
                            sectionMode === 'edit' ? 'var(--brand)' : 'transparent',
                          color:
                            sectionMode === 'edit' ? 'var(--brand-contrast)' : 'var(--text-primary)',
                        }}
                      >
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Editar</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => {
                        setAssistantTab('copilot');
                        setAssistantOpen(true);
                      }}
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold disabled:opacity-50"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        backgroundColor: 'var(--bg-elevated)',
                      }}
                    >
                      <Wand2 className="h-3.5 w-3.5" style={{ color: 'var(--brand)' }} aria-hidden="true" />
                      <span>Melhorar com IA</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => handleSaveSection('approved')}
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium disabled:opacity-50"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                      <span>Aprovar</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Contextual Help Banner */}
              {sectionTipOpen && activeSectionMeta && !readOnly && (
                <div
                  className="no-print mb-5 rounded-xl border p-3.5 text-xs"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-bold">
                        O que vai aqui:{' '}
                        <span className="font-normal">{activeSectionMeta.summary}</span>
                      </p>
                      <p style={{ color: 'var(--text-muted)' }}>
                        <strong>Por que importa:</strong> {activeSectionMeta.whyItMatters}
                      </p>
                      {activeSectionMeta.specialToolHint && (
                        <p className="font-medium" style={{ color: 'var(--brand)' }}>
                          ✦ {activeSectionMeta.specialToolHint}
                        </p>
                      )}
                    </div>
                    <Link
                      href="/guide"
                      className="shrink-0 text-[11px] font-bold underline"
                      style={{ color: 'var(--brand)' }}
                    >
                      Tutorial completo →
                    </Link>
                  </div>
                </div>
              )}

              {sectionMode === 'read' ? (
                <>
                  {!activeSection.content_markdown.trim() && !readOnly ? (
                    <div
                      className="rounded-xl border p-6 text-center"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        backgroundColor: 'var(--bg-elevated)',
                      }}
                    >
                      <p className="text-sm font-semibold">Esta seção ainda não foi gerada.</p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {hasPartialProgress
                          ? 'Clique em "Continuar Geração" para preencher as seções restantes com a IA.'
                          : 'Gere todo o GDD automaticamente ou libere a edição manual.'}
                      </p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleStartGeneration({ resumeOnlyMissing: hasPartialProgress })
                          }
                          disabled={isGenerating}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold"
                          style={{
                            backgroundColor: 'var(--brand)',
                            color: 'var(--brand-contrast)',
                          }}
                        >
                          <Sparkles className="h-4 w-4" aria-hidden="true" />
                          <span>
                            {hasPartialProgress
                              ? 'Continuar Geração com IA'
                              : 'Gerar GDD Completo com IA'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setManualUnlockAll(true);
                            setSectionMode('edit');
                          }}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-4 py-1.5 text-xs font-semibold"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          <Edit3 className="h-4 w-4" aria-hidden="true" />
                          <span>Escrever Manualmente</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <MarkdownRenderer content={activeSection.content_markdown} />
                  )}

                  {activeSection.section_number === 4 && (
                    <ColorPalettePanel
                      section4Markdown={section4Markdown}
                      entities={detail.entities}
                    />
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="section-markdown-editor" className="text-xs font-bold">
                      Editor Markdown ({activeSection.word_count} palavras)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSaveSection()}
                      disabled={isSaving}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold"
                      style={{ backgroundColor: 'var(--brand)', color: 'var(--brand-contrast)' }}
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                      <span>{isSaving ? 'Salvando...' : 'Salvar Seção'}</span>
                    </button>
                  </div>
                  <textarea
                    id="section-markdown-editor"
                    rows={18}
                    value={editorText}
                    onChange={(e) => setEditorText(e.target.value)}
                    className="w-full rounded-xl border p-3 font-mono text-xs leading-relaxed"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {centerView === 'entities' && (
            <div
              className="rounded-2xl border p-6"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold">Tabelas Estruturadas do Projeto</h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Entidades extraídas das seções 4, 7, 9, 11 e 15 e sincronizadas com o CSV Backlog.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCenterView('section')}
                  className="text-xs font-semibold underline"
                  style={{ color: 'var(--brand)' }}
                >
                  Voltar para Seção {activeSectionNumber}
                </button>
              </div>
              <EntityTableEditor
                projectId={detail.project.id}
                entities={detail.entities}
                readOnly={readOnly}
                onChanged={async () => {
                  await refreshProject();
                }}
              />
            </div>
          )}

          {centerView === 'moodboard' && (
            <div
              className="space-y-4 rounded-2xl border p-6"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Moodboard Visual (Direção de Arte)</h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Gerado com Gemini Nano Banana 2.1 usando a paleta HEX e estilo da Seção 4.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCenterView('section')}
                    className="text-xs font-semibold underline"
                    style={{ color: 'var(--brand)' }}
                  >
                    Voltar para Seção
                  </button>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={handleGenerateMoodboard}
                      disabled={isGeneratingMoodboard}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold"
                      style={{ backgroundColor: 'var(--brand)', color: 'var(--brand-contrast)' }}
                    >
                      <ImageIcon className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {isGeneratingMoodboard ? 'Gerando Arte...' : 'Gerar Moodboard com IA'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {detail.project.moodboard_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detail.project.moodboard_image_url}
                  alt={`Moodboard conceitual do jogo ${detail.project.title}`}
                  className="w-full rounded-xl border object-cover"
                  style={{ borderColor: 'var(--border-subtle)' }}
                />
              ) : (
                <p
                  className="rounded-xl border p-8 text-center text-sm"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                >
                  Nenhum moodboard gerado ainda. Gere a Seção 4 primeiro e clique em &ldquo;Gerar
                  Moodboard com IA&rdquo;.
                </p>
              )}
            </div>
          )}

          {centerView === 'versions' && !readOnly && (
            <div
              className="space-y-4 rounded-2xl border p-6"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold">Histórico de Versões & Snapshots</h2>
                <button
                  type="button"
                  onClick={() => setCenterView('section')}
                  className="text-xs font-semibold underline"
                  style={{ color: 'var(--brand)' }}
                >
                  Voltar para Seção
                </button>
              </div>

              <form onSubmit={handleCreateSnapshot} className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="sm:col-span-3">
                  <label htmlFor="snap-version" className="mb-1 block text-xs font-medium">
                    Versão
                  </label>
                  <input
                    id="snap-version"
                    type="text"
                    required
                    value={snapshotVersion}
                    onChange={(e) => setSnapshotVersion(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                    }}
                  />
                </div>
                <div className="sm:col-span-7">
                  <label htmlFor="snap-note" className="mb-1 block text-xs font-medium">
                    Nota da Alteração
                  </label>
                  <input
                    id="snap-note"
                    type="text"
                    value={snapshotNote}
                    onChange={(e) => setSnapshotNote(e.target.value)}
                    placeholder="Ex: Balanceamento de chefes e ajuste de orçamento MVP"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                    }}
                  />
                </div>
                <div className="flex items-end sm:col-span-2">
                  <button
                    type="submit"
                    className="min-h-10 w-full rounded-lg px-3 py-2 text-xs font-bold"
                    style={{ backgroundColor: 'var(--brand)', color: 'var(--brand-contrast)' }}
                  >
                    Salvar
                  </button>
                </div>
              </form>

              <ul className="space-y-2">
                {detail.versions.map((ver) => (
                  <li
                    key={ver.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-xs"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div>
                      <p className="font-bold">
                        {ver.version_label} —{' '}
                        <span style={{ color: 'var(--text-muted)' }}>
                          {new Date(ver.created_at).toLocaleString('pt-BR')}
                        </span>
                      </p>
                      <p style={{ color: 'var(--text-muted)' }}>{ver.changelog_note}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreVersion(ver.id)}
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg border px-3 py-1 font-semibold"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Restaurar</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Retractable Right Panel: Copilot AI & Section Notes (Closed by Default) */}
        {assistantOpen && !readOnly && !isGenerating && (
          <aside
            aria-label="Assistente Copiloto e Notas"
            className="no-print lg:col-span-3"
          >
            <div
              className="rounded-2xl border p-4"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div
                  role="tablist"
                  aria-label="Abas do Assistente"
                  className="inline-flex rounded-lg border p-0.5"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                  }}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={assistantTab === 'copilot'}
                    onClick={() => setAssistantTab('copilot')}
                    className="inline-flex min-h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold"
                    style={{
                      backgroundColor: assistantTab === 'copilot' ? 'var(--brand)' : 'transparent',
                      color:
                        assistantTab === 'copilot' ? 'var(--brand-contrast)' : 'var(--text-primary)',
                    }}
                  >
                    <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Copiloto</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={assistantTab === 'comments'}
                    onClick={() => setAssistantTab('comments')}
                    className="inline-flex min-h-8 items-center gap-1 rounded-md px-2.5 text-xs font-semibold"
                    style={{
                      backgroundColor: assistantTab === 'comments' ? 'var(--brand)' : 'transparent',
                      color:
                        assistantTab === 'comments' ? 'var(--brand-contrast)' : 'var(--text-primary)',
                    }}
                  >
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Notas ({sectionComments.length})</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setAssistantOpen(false)}
                  aria-label="Fechar painel Copiloto e Notas"
                  className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg border"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {assistantTab === 'copilot' ? (
                <div className="space-y-3">
                  <p className="text-xs font-bold">
                    Refinar Seção {activeSectionNumber} com IA
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Sugestões contextuais para esta seção:
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {(
                      activeSectionMeta?.exampleRefinePrompts ?? [
                        'Aprofundar com números concretos e tabelas',
                        'Adaptar escopo para equipe indie enxuta (MVP)',
                      ]
                    ).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleRefineSection(preset)}
                        disabled={isRefining}
                        className="rounded-lg border px-2.5 py-2 text-left text-[11px] leading-snug hover:opacity-80"
                        style={{
                          borderColor: 'var(--border-subtle)',
                          backgroundColor: 'var(--bg-elevated)',
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2 pt-2">
                    <label htmlFor="refine-input" className="block text-[11px] font-semibold">
                      Instrução personalizada
                    </label>
                    <textarea
                      id="refine-input"
                      rows={3}
                      value={refineInstruction}
                      onChange={(e) => setRefineInstruction(e.target.value)}
                      placeholder="Ex: Transforme o combate em estilo Souls-like..."
                      className="w-full rounded-lg border px-3 py-2 text-xs"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        backgroundColor: 'var(--bg-elevated)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRefineSection()}
                      disabled={isRefining || !refineInstruction.trim()}
                      className="min-h-9 w-full rounded-lg px-3.5 py-2 text-xs font-bold disabled:opacity-60"
                      style={{ backgroundColor: 'var(--brand)', color: 'var(--brand-contrast)' }}
                    >
                      {isRefining ? 'Refinando...' : 'Aplicar Refinamento'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold">Notas da Seção {activeSectionNumber}</p>
                  <form onSubmit={handleAddComment} className="space-y-2">
                    <label htmlFor="comment-input" className="sr-only">
                      Adicionar nota na seção
                    </label>
                    <textarea
                      id="comment-input"
                      rows={2}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Adicionar nota de revisão para a equipe..."
                      className="w-full rounded-lg border px-3 py-2 text-xs"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        backgroundColor: 'var(--bg-elevated)',
                      }}
                    />
                    <button
                      type="submit"
                      className="min-h-9 w-full rounded-lg border px-3 py-1.5 text-xs font-semibold"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        backgroundColor: 'var(--bg-elevated)',
                      }}
                    >
                      Adicionar Nota
                    </button>
                  </form>

                  {sectionComments.length > 0 && (
                    <ul className="max-h-56 space-y-1.5 overflow-y-auto text-xs">
                      {sectionComments.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-lg border p-2.5"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          <p className="font-semibold">{c.author_name}</p>
                          <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {c.body}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      <AuditChecklistDialog
        open={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        audit={detail.latestAudit}
      />
    </div>
  );
}
