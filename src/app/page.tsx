import { ArrowRight, BookOpen, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { NewGddWizard } from '@/components/NewGddWizard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { GddProjectRecord, GddTemplateRecord } from '@/types/gdd';

export const dynamic = 'force-dynamic';

/**
 * Main AgentGDD Studio dashboard. Requires authentication for personal project management
 * while showcasing available genre templates on the landing view.
 */
export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: templates } = await supabase
    .from('gdd_templates')
    .select('*')
    .order('sort_order', { ascending: true });

  let projects: GddProjectRecord[] = [];
  if (user) {
    const { data } = await supabase
      .from('gdd_projects')
      .select('*')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false });
    projects = (data ?? []) as GddProjectRecord[];
  }

  return (
    <div className="min-h-dvh">
      <Navbar userEmail={user?.email} />

      <main id="main-content" className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        {!user ? (
          <section className="space-y-8">
            <div
              className="rounded-3xl border p-8 sm:p-10"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <p
                className="mb-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--brand)' }}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Estúdio Profissional de Game Design Documents
              </p>
              <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">
                Transforme ideias de jogos em Bíblias de Produção completas em 15 seções.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-muted)' }}>
                Baseado no Prompt Profissional de Especialista GDD com geração multi-estágio via Gemini AI,
                detector de conflitos técnicos, paleta HEX interativa, diagramas Mermaid, auditoria de
                15 critérios e persistência segura no Supabase.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold"
                  style={{ backgroundColor: 'var(--brand)', color: 'var(--brand-contrast)' }}
                >
                  <span>Entrar ou Criar Conta</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                {
                  icon: BookOpen,
                  title: '12 Seções Obrigatórias + 3 Studio',
                  desc: 'Narrativa, mecânicas, economia, inimigos, HUD, roadmap MVP vs Full, Netcode, Acessibilidade e Matriz de Riscos.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Auditoria & Conflitos Técnicos',
                  desc: 'Verifica precisão numérica, paleta HEX válida, tabelas estruturadas e incompatibilidades de engine/escopo.',
                },
                {
                  icon: Sparkles,
                  title: 'Moodboard & Exportação Studio',
                  desc: 'Exporte em Markdown, JSON, CSV Backlog para Jira/Linear ou imprima em PDF formatado.',
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.title}
                    className="rounded-2xl border p-5"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface)',
                    }}
                  >
                    <Icon className="mb-3 h-5 w-5" style={{ color: 'var(--brand)' }} aria-hidden="true" />
                    <h2 className="text-base font-bold">{card.title}</h2>
                    <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {card.desc}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <>
            <section aria-labelledby="dashboard-heading" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 id="dashboard-heading" className="text-2xl font-extrabold tracking-tight">
                    Meus Projetos GDD ({projects.length})
                  </h1>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Gerencie documentos, execute auditorias ou crie um novo GDD abaixo.
                  </p>
                </div>
              </div>

              {projects.length === 0 ? (
                <div
                  className="rounded-2xl border p-6 text-sm"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Você ainda não criou nenhum GDD. Use o assistente abaixo para gerar seu primeiro documento!
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {projects.map((proj) => (
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
                          <h2 className="text-base font-bold">{proj.title}</h2>
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
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
                        <p className="mt-3 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {proj.concept_brief?.idea || 'Sem descrição'}
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {new Date(proj.updated_at).toLocaleDateString('pt-BR')}
                        </span>
                        <Link
                          href={`/projects/${proj.id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold"
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

            <NewGddWizard templates={(templates ?? []) as GddTemplateRecord[]} />
          </>
        )}
      </main>
    </div>
  );
}
