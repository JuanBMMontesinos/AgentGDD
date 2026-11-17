import { ArrowLeft, BookOpen, PlusCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { getSectionGroups } from '@/lib/gdd/sections';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Interactive Tutorial & Reference Guide explaining the AgentGDD workflow, Studio tools,
 * and every one of the 15 GDD sections grouped by discipline (Blocks A–D).
 */
export default async function GuidePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const groups = getSectionGroups('pt-BR', true);

  return (
    <div className="min-h-dvh">
      <Navbar userEmail={user?.email} />

      <main id="main-content" className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Voltar ao Início</span>
          </Link>

          <Link
            href={user ? '/new' : '/login'}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold"
            style={{ backgroundColor: 'var(--brand)', color: 'var(--brand-contrast)' }}
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            <span>{user ? 'Criar Novo GDD Agora' : 'Entrar para Criar GDD'}</span>
          </Link>
        </div>

        <section
          className="rounded-3xl border p-7 sm:p-8"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <p
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
            style={{ color: 'var(--brand)' }}
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Tutorial do AgentGDD
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Como funciona o AgentGDD e o papel de cada uma das 15 seções
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Use este guia para entender o fluxo completo — desde o Wizard em 3 passos até a
            auditoria de qualidade e exportação para backlog de produção.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: 'Passo 1 · Wizard (/new)',
                text: 'Escolha um dos 11 templates ou escreva sua ideia e valide conflitos de engine/escopo.',
              },
              {
                step: 'Passo 2 · Geração 4 Estágios',
                text: 'A IA gera o GDD em 4 blocos encadeados mantendo coerência numérica e salvando no Supabase.',
              },
              {
                step: 'Passo 3 · Studio & Copiloto',
                text: 'Navegue pelos blocos A–D, ajuste tabelas, visualize paleta HEX/Mermaid e refine seções.',
              },
              {
                step: 'Passo 4 · Auditar & Exportar',
                text: 'Rode a Auditoria (15 critérios), salve snapshot v1.0 e exporte .MD, PDF ou CSV Backlog.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border p-4"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                <p className="text-xs font-bold" style={{ color: 'var(--brand)' }}>
                  {item.step}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Detailed 15 Sections Breakdown */}
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.id} aria-labelledby={`guide-group-${group.id}`} className="space-y-4">
              <div>
                <h2 id={`guide-group-${group.id}`} className="text-xl font-extrabold">
                  {group.label}
                </h2>
                <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                  {group.description}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {group.sections.map((sec) => (
                  <article
                    key={sec.number}
                    className="flex flex-col justify-between rounded-2xl border p-5"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface)',
                    }}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold">{sec.title}</h3>
                        <span
                          className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            borderColor: 'var(--border-subtle)',
                            backgroundColor: 'var(--bg-elevated)',
                          }}
                        >
                          {sec.optional ? 'Studio / Opcional' : 'Obrigatória'}
                        </span>
                      </div>

                      <p className="text-xs leading-relaxed">{sec.summary}</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        <strong>Por que importa:</strong> {sec.whyItMatters}
                      </p>

                      {sec.specialToolHint && (
                        <p
                          className="flex items-start gap-1.5 rounded-lg border px-2.5 py-2 text-[11px]"
                          style={{
                            borderColor: 'var(--brand)',
                            backgroundColor: 'var(--bg-elevated)',
                          }}
                        >
                          <Sparkles
                            className="mt-0.5 h-3.5 w-3.5 shrink-0"
                            style={{ color: 'var(--brand)' }}
                            aria-hidden="true"
                          />
                          <span>{sec.specialToolHint}</span>
                        </p>
                      )}

                      <div className="pt-1">
                        <p
                          className="text-[11px] font-semibold uppercase tracking-wide"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Subseções esperadas
                        </p>
                        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {sec.expectedSubsections.join(' · ')}
                        </p>
                      </div>
                    </div>

                    <div
                      className="mt-4 border-t pt-3 text-[11px]"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <p className="font-semibold" style={{ color: 'var(--brand)' }}>
                        Exemplos de comandos para o Copiloto IA:
                      </p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4" style={{ color: 'var(--text-muted)' }}>
                        {sec.exampleRefinePrompts.map((ex) => (
                          <li key={ex}>&ldquo;{ex}&rdquo;</li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
