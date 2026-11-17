'use client';

import {
  ArrowRight,
  BookOpen,
  Download,
  PlusCircle,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GddProjectRecord, GddTemplateRecord } from '@/types/gdd';

interface ProjectsDashboardClientProps {
  initialProjects: GddProjectRecord[];
  featuredTemplates: GddTemplateRecord[];
}

/**
 * Clean Project Hub for `/` separating saved project management from the 3-step creation Wizard.
 */
export function ProjectsDashboardClient({
  initialProjects,
  featuredTemplates,
}: ProjectsDashboardClientProps) {
  const [projects, setProjects] = useState<GddProjectRecord[]>(initialProjects);
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<GddProjectRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (deleteTarget && !dialog.open) {
      dialog.showModal();
    } else if (!deleteTarget && dialog.open) {
      dialog.close();
    }
  }, [deleteTarget]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => {
      const haystack = `${p.title} ${p.studio_name} ${p.concept_brief?.genrePrimary ?? ''} ${p.concept_brief?.engine ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [projects, query]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Clean Header + Single Primary Action */}
      <section
        aria-labelledby="dashboard-heading"
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-6"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div>
          <h1 id="dashboard-heading" className="text-2xl font-extrabold tracking-tight">
            Meus Projetos GDD ({projects.length})
          </h1>
          <p className="mt-1 text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
            Gerencie seus Game Design Documents ou inicie um novo projeto guiado em 3 passos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/guide"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-elevated)',
            }}
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            <span>Como Funciona (Tutorial)</span>
          </Link>

          <Link
            href="/new"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition hover:opacity-90"
            style={{
              backgroundColor: 'var(--brand)',
              color: 'var(--brand-contrast)',
            }}
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            <span>Criar Novo GDD</span>
          </Link>
        </div>
      </section>

      {/* Search & Project Grid */}
      <section aria-label="Lista de projetos" className="space-y-4">
        {projects.length > 0 && (
          <div className="relative max-w-md">
            <label htmlFor="project-search" className="sr-only">
              Buscar projetos GDD
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: 'var(--text-muted)' }}
              aria-hidden="true"
            />
            <input
              id="project-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título, gênero ou engine..."
              className="w-full rounded-xl border py-2 pl-9 pr-3 text-sm"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            />
          </div>
        )}

        {filteredProjects.length === 0 ? (
          <div
            className="rounded-2xl border p-8 text-center"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <Sparkles
              className="mx-auto mb-3 h-7 w-7"
              style={{ color: 'var(--brand)' }}
              aria-hidden="true"
            />
            <h2 className="text-base font-bold">
              {projects.length === 0
                ? 'Nenhum GDD criado ainda'
                : 'Nenhum projeto encontrado para sua busca'}
            </h2>
            <p className="mx-auto mt-1 max-w-md text-xs" style={{ color: 'var(--text-muted)' }}>
              {projects.length === 0
                ? 'Clique em "Criar Novo GDD" para transformar sua ideia em um documento completo de 15 seções em menos de 1 minuto.'
                : 'Tente outro termo de busca ou limpe o filtro.'}
            </p>
            {projects.length === 0 && (
              <Link
                href="/new"
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold"
                style={{
                  backgroundColor: 'var(--brand)',
                  color: 'var(--brand-contrast)',
                }}
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                <span>Começar Meu Primeiro GDD</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((proj) => (
              <article
                key={proj.id}
                className="flex flex-col justify-between rounded-2xl border p-5 transition hover:shadow-md"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold leading-snug">{proj.title}</h2>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                      style={{
                        backgroundColor: 'var(--brand)',
                        color: 'var(--brand-contrast)',
                      }}
                    >
                      {proj.completeness_score}%
                    </span>
                  </div>

                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {proj.studio_name} · {proj.version_label} · {proj.status}
                  </p>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {proj.concept_brief?.genrePrimary && (
                      <span
                        className="rounded-md border px-2 py-0.5 text-[11px]"
                        style={{
                          borderColor: 'var(--border-subtle)',
                          backgroundColor: 'var(--bg-elevated)',
                        }}
                      >
                        {proj.concept_brief.genrePrimary}
                      </span>
                    )}
                    {proj.concept_brief?.engine && (
                      <span
                        className="rounded-md border px-2 py-0.5 text-[11px]"
                        style={{
                          borderColor: 'var(--border-subtle)',
                          backgroundColor: 'var(--bg-elevated)',
                        }}
                      >
                        {proj.concept_brief.engine}
                      </span>
                    )}
                  </div>

                  <p
                    className="mt-3 line-clamp-2 text-xs leading-relaxed"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {proj.concept_brief?.idea || 'Sem descrição'}
                  </p>
                </div>

                <div
                  className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`/api/projects/${proj.id}/export?format=md`}
                      aria-label={`Exportar Markdown de ${proj.title}`}
                      className="inline-flex min-h-8 items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <Download className="h-3 w-3" aria-hidden="true" />
                      <span>.MD</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(proj)}
                      aria-label={`Excluir projeto ${proj.title}`}
                      className="inline-flex min-h-8 items-center justify-center rounded-lg border px-2 py-1 text-[11px]"
                      style={{ borderColor: 'var(--border-subtle)', color: 'var(--danger)' }}
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>

                  <Link
                    href={`/projects/${proj.id}`}
                    className="inline-flex min-h-8 items-center gap-1 text-xs font-bold"
                    style={{ color: 'var(--brand)' }}
                  >
                    <span>Abrir Studio</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Compact Quick-Start Featured Templates Strip */}
      {featuredTemplates.length > 0 && (
        <section
          aria-labelledby="quick-templates-heading"
          className="rounded-2xl border p-5"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="quick-templates-heading" className="text-base font-bold">
                Atalhos Rápidos por Template
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Selecione um template pronto para abrir o Wizard já preenchido.
              </p>
            </div>
            <Link href="/new" className="text-xs font-bold" style={{ color: 'var(--brand)' }}>
              Ver todos os 11 gêneros →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featuredTemplates.map((tpl) => (
              <Link
                key={tpl.id}
                href={`/new?template=${tpl.slug}`}
                className="flex flex-col justify-between rounded-xl border p-3.5 transition hover:shadow-sm"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                <div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: 'var(--brand)' }}
                  >
                    {tpl.genre_primary}
                  </span>
                  <h3 className="mt-1 text-xs font-bold">{tpl.name}</h3>
                  <p className="mt-1 line-clamp-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {tpl.description}
                  </p>
                </div>
                <span className="mt-2 text-[11px] font-semibold" style={{ color: 'var(--brand)' }}>
                  Usar template →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Accessible Native Modal Dialog for Project Deletion */}
      <dialog
        ref={dialogRef}
        onClose={() => setDeleteTarget(null)}
        aria-labelledby="delete-dialog-title"
        className="m-auto w-full max-w-md rounded-2xl border p-6 shadow-xl"
        style={{
          borderColor: 'var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-primary)',
        }}
      >
        <h2 id="delete-dialog-title" className="text-lg font-bold">
          Excluir Projeto GDD?
        </h2>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Esta ação removerá permanentemente <strong>{deleteTarget?.title}</strong>, todas as suas
          seções, tabelas, auditorias e versões salvas.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            className="min-h-9 rounded-lg border px-3.5 py-1.5 text-xs font-semibold"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={confirmDelete}
            className="min-h-9 rounded-lg px-3.5 py-1.5 text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--danger)' }}
          >
            {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
          </button>
        </div>
      </dialog>
    </div>
  );
}
