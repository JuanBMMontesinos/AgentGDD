import { ArrowRight, BookOpen, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { ProjectsDashboardClient } from '@/components/ProjectsDashboardClient';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { GddProjectRecord, GddTemplateRecord } from '@/types/gdd';

export const dynamic = 'force-dynamic';

/**
 * Main AgentGDD Studio Hub. Authenticated users manage saved projects and launch quick
 * templates into `/new`, while unauthenticated visitors see the overview and login CTA.
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

  const allTemplates = (templates ?? []) as GddTemplateRecord[];
  const featuredTemplates = allTemplates.filter((t) => t.is_featured).slice(0, 4);

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
              <p
                className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base"
                style={{ color: 'var(--text-muted)' }}
              >
                Geração multi-estágio via Gemini AI, detector de conflitos técnicos, paleta HEX
                interativa, diagramas Mermaid, auditoria de 15 critérios e persistência segura no
                Supabase.
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
                <Link
                  href="/guide"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--bg-elevated)',
                  }}
                >
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  <span>Ver Tutorial das 15 Seções</span>
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
                    <Icon
                      className="mb-3 h-5 w-5"
                      style={{ color: 'var(--brand)' }}
                      aria-hidden="true"
                    />
                    <h2 className="text-base font-bold">{card.title}</h2>
                    <p
                      className="mt-1.5 text-xs leading-relaxed"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {card.desc}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <ProjectsDashboardClient
            initialProjects={projects}
            featuredTemplates={
              featuredTemplates.length > 0 ? featuredTemplates : allTemplates.slice(0, 4)
            }
          />
        )}
      </main>
    </div>
  );
}
