'use client';

import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  Edit3,
  Eye,
  History,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  Printer,
  RotateCcw,
  Save,
  Share2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuditChecklistDialog } from '@/components/AuditChecklistDialog';
import { ColorPalettePanel } from '@/components/ColorPalettePanel';
import { EntityTableEditor } from '@/components/EntityTableEditor';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import type { GddProjectDetail, GddReviewStatus, GddSectionRecord } from '@/types/gdd';

interface GddStudioWorkspaceProps {
  initialDetail: GddProjectDetail;
  autoGenerateOnMount?: boolean;
  readOnly?: boolean;
}

type WorkspaceTab = 'read' | 'edit' | 'entities' | 'moodboard' | 'versions';

/**
 * Full interactive Game Design Document Studio providing multi-stage AI streaming,
 * section editing, HEX color swatches, Mermaid diagrams, structured entity tables,
 * quality auditing, version snapshots, comments, and multi-format exports.
 */
export function GddStudioWorkspace({
  initialDetail,
  autoGenerateOnMount = false,
  readOnly = false,
}: GddStudioWorkspaceProps) {
  const [detail, setDetail] = useState<GddProjectDetail>(initialDetail);
  const [activeSectionNumber, setActiveSectionNumber] = useState<number>(
    initialDetail.sections[0]?.section_number ?? 1
  );
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('read');
  const [editorText, setEditorText] = useState<string>(
    initialDetail.sections[0]?.content_markdown ?? ''
  );
  const [refineInstruction, setRefineInstruction] = useState('');
  const [newComment, setNewComment] = useState('');
  const [snapshotNote, setSnapshotNote] = useState('');
  const [snapshotVersion, setSnapshotVersion] = useState('v1.1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgressText, setGenProgressText] = useState<string | null>(null);
  const [streamPreview, setStreamPreview] = useState<string>('');
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

  const activeSection: GddSectionRecord | undefined = useMemo(
    () => detail.sections.find((s) => s.section_number === activeSectionNumber),
    [detail.sections, activeSectionNumber]
  );

  const section4Markdown = useMemo(
    () => detail.sections.find((s) => s.section_number === 4)?.content_markdown ?? '',
    [detail.sections]
  );

  const sectionComments = useMemo(
    () => detail.comments.filter((c) => c.section_number === activeSectionNumber),
    [detail.comments, activeSectionNumber]
  );

  const refreshProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${detail.project.id}`);
    if (res.ok) {
      const updated = (await res.json()) as GddProjectDetail;
      setDetail(updated);
      const current = updated.sections.find((s) => s.section_number === activeSectionNumber);
      if (current) {
        setEditorText(current.content_markdown);
      }
    }
  }, [detail.project.id, activeSectionNumber]);

  const handleSelectSection = (sec: GddSectionRecord) => {
    setActiveSectionNumber(sec.section_number);
    setEditorText(sec.content_markdown);
  };

  const handleGenerateFullGdd = useCallback(async () => {
    if (isGenerating || readOnly) return;
    setIsGenerating(true);
    setStreamPreview('');
    setGenProgressText('Conectando à orquestração Gemini AI...');
    setStatusBanner(null);

    try {
      const res = await fetch(`/api/projects/${detail.project.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel }),
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
            setGenProgressText(
              `Estágio ${payload.stageNumber}/${payload.totalStages}: ${payload.label}`
            );
          } else if (eventName === 'text_delta') {
            setStreamPreview((prev) => `${prev}${payload.chunk}`.slice(-1800));
          } else if (eventName === 'stage_saved') {
            await refreshProject();
          } else if (eventName === 'error') {
            setStatusBanner(`Erro na geração: ${payload.message}`);
          } else if (eventName === 'done') {
            await refreshProject();
            setGenProgressText(null);
            setStatusBanner(
              `GDD completo gerado e auditado! Score de Qualidade: ${payload.overallScore}%`
            );
          }
        }
      }
    } catch (err) {
      setStatusBanner(err instanceof Error ? err.message : 'Erro ao gerar GDD.');
    } finally {
      setIsGenerating(false);
    }
  }, [detail.project.id, isGenerating, readOnly, refreshProject, selectedModel]);

  useEffect(() => {
    if (autoGenerateOnMount && !autoTriggeredRef.current && !readOnly) {
      autoTriggeredRef.current = true;
      void handleGenerateFullGdd();
    }
  }, [autoGenerateOnMount, handleGenerateFullGdd, readOnly]);

  async function handleSaveSection(newStatus?: GddReviewStatus) {
    if (!activeSection || readOnly) return;
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
        setStatusBanner(`Seção ${activeSection.section_number} salva e auditada.`);
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRefineSection(instructionOverride?: string) {
    const promptText = instructionOverride ?? refineInstruction;
    if (!activeSection || !promptText.trim() || readOnly) return;

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
        setActiveTab('read');
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
    if (isAuditing) return;
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
    if (!snapshotVersion.trim() || readOnly) return;
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
    if (readOnly) return;
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
    if (readOnly) return;
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
    if (!newComment.trim() || readOnly) return;
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
    if (readOnly) return;
    setIsGeneratingMoodboard(true);
    try {
      const res = await fetch(`/api/projects/${detail.project.id}/moodboard`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        await refreshProject();
        setActiveTab('moodboard');
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Studio Top Bar */}
      <div
        className="no-print mb-6 rounded-2xl border p-4 sm:p-5"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">{detail.project.title}</h1>
              <span
                className="rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
              >
                {detail.project.version_label}
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                style={{ backgroundColor: 'var(--brand)', color: 'var(--brand-contrast)' }}
              >
                Score: {detail.project.completeness_score}%
              </span>
            </div>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Estúdio: {detail.project.studio_name} · Idioma: {detail.project.language} · Modo:{' '}
              {detail.project.depth_mode === 'full' ? 'Bíblia Completa' : 'MVP Enxuto'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!readOnly && (
              <>
                <select
                  aria-label="Modelo Gemini para geração"
                  value={selectedModel}
                  onChange={(e) =>
                    setSelectedModel(e.target.value as 'gemini-3.8-flash' | 'gemini-4-argon')
                  }
                  className="min-h-9 rounded-lg border px-2.5 text-xs"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                  }}
                >
                  <option value="gemini-3.8-flash">Gemini 3.8 Flash (Rápido)</option>
                  <option value="gemini-4-argon">Gemini 4 Argon (Profundo)</option>
                </select>

                <button
                  type="button"
                  onClick={handleGenerateFullGdd}
                  disabled={isGenerating}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition hover:opacity-90 disabled:opacity-60"
                  style={{
                    backgroundColor: 'var(--brand)',
                    color: 'var(--brand-contrast)',
                  }}
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <span>{isGenerating ? 'Gerando GDD...' : 'Gerar GDD Completo com IA'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunAudit}
                  disabled={isAuditing}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                  }}
                >
                  <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                  <span>{isAuditing ? 'Auditando...' : 'Auditar Qualidade'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleShare}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                  }}
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  <span>{detail.project.is_public ? 'Público Ativo' : 'Compartilhar'}</span>
                </button>
              </>
            )}

            <a
              href={`/api/projects/${detail.project.id}/export?format=md`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-elevated)',
              }}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>.MD</span>
            </a>

            <a
              href={`/api/projects/${detail.project.id}/export?format=csv`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-elevated)',
              }}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>CSV Backlog</span>
            </a>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-elevated)',
              }}
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span>PDF / Imprimir</span>
            </button>
          </div>
        </div>

        {shareUrl && (
          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            Link público somente leitura:{' '}
            <a href={shareUrl} className="font-semibold underline" style={{ color: 'var(--brand)' }}>
              {shareUrl}
            </a>
          </p>
        )}

        {genProgressText && (
          <div className="mt-4 rounded-xl border p-3 text-xs" style={{ borderColor: 'var(--brand)', backgroundColor: 'var(--bg-elevated)' }}>
            <p className="font-bold" style={{ color: 'var(--brand)' }}>
              {genProgressText}
            </p>
            {streamPreview && (
              <pre className="mt-2 max-h-28 overflow-hidden whitespace-pre-wrap font-mono text-[11px] opacity-80">
                {streamPreview}
              </pre>
            )}
          </div>
        )}

        {statusBanner && (
          <p role="status" className="mt-3 rounded-lg border px-3 py-2 text-xs font-medium" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}>
            {statusBanner}
          </p>
        )}
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Navigation: 12-15 Sections */}
        <aside className="no-print lg:col-span-3">
          <nav
            aria-label="Seções do GDD"
            className="studio-scroll max-h-[75dvh] space-y-1.5 overflow-y-auto rounded-2xl border p-3"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <p className="px-2 py-1 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Estrutura do GDD ({detail.sections.length})
            </p>
            {detail.sections.map((sec) => {
              const selected = sec.section_number === activeSectionNumber;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => handleSelectSection(sec)}
                  className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition"
                  style={{
                    backgroundColor: selected ? 'var(--brand)' : 'transparent',
                    color: selected ? 'var(--brand-contrast)' : 'var(--text-primary)',
                  }}
                >
                  <span className="truncate font-medium">{sec.title}</span>
                  <span className="shrink-0 text-[10px] opacity-80">
                    {sec.word_count > 0 ? `${sec.word_count}w` : 'vazio'}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Center Studio Panel */}
        <div className="min-w-0 space-y-6 lg:col-span-9">
          {/* Workspace Mode Tabs */}
          <div
            role="tablist"
            aria-label="Modos do Studio"
            className="no-print flex flex-wrap gap-2 rounded-2xl border p-2"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            {(
              [
                { id: 'read', label: 'Leitura Studio', icon: Eye },
                ...(!readOnly ? [{ id: 'edit', label: 'Editar Markdown', icon: Edit3 }] : []),
                { id: 'entities', label: `Tabelas (${detail.entities.length})`, icon: Layers },
                { id: 'moodboard', label: 'Moodboard Visual', icon: ImageIcon },
                ...(!readOnly
                  ? [{ id: 'versions', label: `Versões (${detail.versions.length})`, icon: History }]
                  : []),
              ] as Array<{ id: WorkspaceTab; label: string; icon: typeof Eye }>
            ).map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.id)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition"
                  style={{
                    backgroundColor: selected ? 'var(--brand)' : 'transparent',
                    color: selected ? 'var(--brand-contrast)' : 'var(--text-primary)',
                  }}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab Content */}
          <section
            className="rounded-2xl border p-6"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            {activeTab === 'read' && activeSection && (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                  <h2 className="text-xl font-bold">{activeSection.title}</h2>
                  {!readOnly && (
                    <div className="no-print flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Status: <strong>{activeSection.review_status}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSaveSection('approved')}
                        className="inline-flex min-h-8 items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium"
                        style={{ borderColor: 'var(--border-subtle)' }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                        <span>Aprovar Seção</span>
                      </button>
                    </div>
                  )}
                </div>

                <MarkdownRenderer content={activeSection.content_markdown} />

                {activeSection.section_number === 4 && (
                  <ColorPalettePanel
                    section4Markdown={section4Markdown}
                    entities={detail.entities}
                  />
                )}
              </>
            )}

            {activeTab === 'edit' && activeSection && !readOnly && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="section-markdown-editor" className="text-sm font-bold">
                    Editando: {activeSection.title}
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

            {activeTab === 'entities' && (
              <EntityTableEditor
                projectId={detail.project.id}
                entities={detail.entities}
                readOnly={readOnly}
                onChanged={refreshProject}
              />
            )}

            {activeTab === 'moodboard' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">Moodboard Visual (Direção de Arte)</h2>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Gerado com Gemini Nano Banana 2.1 usando a paleta HEX e estilo da Seção 4.
                    </p>
                  </div>
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

                {detail.project.moodboard_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detail.project.moodboard_image_url}
                    alt={`Moodboard conceitual do jogo ${detail.project.title}`}
                    className="w-full rounded-xl border object-cover"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  />
                ) : (
                  <p className="rounded-xl border p-8 text-center text-sm" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                    Nenhum moodboard gerado ainda. Gere a Seção 4 primeiro e clique em &ldquo;Gerar Moodboard com IA&rdquo;.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'versions' && !readOnly && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">Histórico de Versões & Snapshots</h2>
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
                      style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
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
                      style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
                    />
                  </div>
                  <div className="flex items-end sm:col-span-2">
                    <button
                      type="submit"
                      className="min-h-10 w-full rounded-lg px-3 py-2 text-xs font-bold"
                      style={{ backgroundColor: 'var(--brand)', color: 'var(--brand-contrast)' }}
                    >
                      Salvar Snapshot
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

          {/* AI Section Copilot & Comments */}
          {!readOnly && activeSection && (
            <div className="no-print grid grid-cols-1 gap-6 md:grid-cols-2">
              <section
                aria-labelledby="copilot-heading"
                className="rounded-2xl border p-5"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <h3 id="copilot-heading" className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <Wand2 className="h-4 w-4" style={{ color: 'var(--brand)' }} aria-hidden="true" />
                  Copiloto de Refinamento (Seção {activeSection.section_number})
                </h3>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {[
                    'Aprofundar com números concretos e tabelas',
                    'Adaptar escopo para equipe indie enxuta (MVP)',
                    'Adicionar mais 3 variações e exemplos práticos',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleRefineSection(preset)}
                      disabled={isRefining}
                      className="rounded-lg border px-2.5 py-1 text-[11px] hover:opacity-80"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        backgroundColor: 'var(--bg-elevated)',
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <label htmlFor="refine-input" className="sr-only">
                    Instrução personalizada para refinar esta seção
                  </label>
                  <input
                    id="refine-input"
                    type="text"
                    value={refineInstruction}
                    onChange={(e) => setRefineInstruction(e.target.value)}
                    placeholder="Ex: Transforme o combate em estilo Souls-like..."
                    className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-xs"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRefineSection()}
                    disabled={isRefining || !refineInstruction.trim()}
                    className="min-h-9 rounded-lg px-3.5 py-2 text-xs font-bold disabled:opacity-60"
                    style={{ backgroundColor: 'var(--brand)', color: 'var(--brand-contrast)' }}
                  >
                    {isRefining ? 'Refinando...' : 'Refinar'}
                  </button>
                </div>
              </section>

              <section
                aria-labelledby="comments-heading"
                className="rounded-2xl border p-5"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <h3 id="comments-heading" className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <MessageSquare className="h-4 w-4" style={{ color: 'var(--brand)' }} aria-hidden="true" />
                  Notas & Revisão da Seção ({sectionComments.length})
                </h3>
                <form onSubmit={handleAddComment} className="mb-3 flex gap-2">
                  <label htmlFor="comment-input" className="sr-only">
                    Adicionar nota na seção
                  </label>
                  <input
                    id="comment-input"
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Adicionar nota de revisão para a equipe..."
                    className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-xs"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                    }}
                  />
                  <button
                    type="submit"
                    className="min-h-9 rounded-lg border px-3 py-2 text-xs font-semibold"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-elevated)',
                    }}
                  >
                    Comentar
                  </button>
                </form>

                {sectionComments.length > 0 && (
                  <ul className="max-h-32 space-y-1.5 overflow-y-auto text-xs">
                    {sectionComments.map((c) => (
                      <li
                        key={c.id}
                        className="rounded-lg border p-2"
                        style={{ borderColor: 'var(--border-subtle)' }}
                      >
                        <span className="font-semibold">{c.author_name}: </span>
                        <span style={{ color: 'var(--text-muted)' }}>{c.body}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      <AuditChecklistDialog
        open={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        audit={detail.latestAudit}
      />
    </div>
  );
}
