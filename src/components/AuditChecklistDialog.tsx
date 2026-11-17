'use client';

import { AlertTriangle, CheckCircle2, X, XCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { GddAuditReportRecord } from '@/types/gdd';

interface AuditChecklistDialogProps {
  open: boolean;
  onClose: () => void;
  audit: GddAuditReportRecord | null;
}

/**
 * Native accessible modal `<dialog>` displaying the automated 15-point GDD quality audit,
 * technical conflicts, and actionable recommendations.
 */
export function AuditChecklistDialog({ open, onClose, audit }: AuditChecklistDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="audit-dialog-title"
      className="m-auto max-h-[85dvh] w-full max-w-3xl rounded-2xl border p-0 shadow-2xl"
      style={{
        borderColor: 'var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-primary)',
      }}
    >
      <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h2 id="audit-dialog-title" className="text-lg font-bold">
            Auditoria de Qualidade & Consistência do GDD
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Verificação automática do Checklist Final (15 critérios) + conflitos técnicos
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar relatório de auditoria"
          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="studio-scroll max-h-[70dvh] space-y-5 overflow-y-auto p-6">
        {!audit ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhuma auditoria executada ainda. Clique em &ldquo;Auditar Qualidade&rdquo;.
          </p>
        ) : (
          <>
            <div
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-elevated)',
              }}
            >
              <div>
                <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
                  Score Geral do Documento
                </span>
                <p className="text-3xl font-extrabold" style={{ color: 'var(--brand)' }}>
                  {audit.overall_score}%
                </p>
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {audit.checklist_results.filter((c) => c.passed).length} de{' '}
                {audit.checklist_results.length} critérios aprovados
              </div>
            </div>

            {audit.conflicts_detected.length > 0 && (
              <section aria-labelledby="audit-conflicts-heading" className="space-y-2">
                <h3 id="audit-conflicts-heading" className="text-sm font-bold">
                  Conflitos Técnicos & Alertas de Escopo
                </h3>
                <ul className="space-y-2">
                  {audit.conflicts_detected.map((conflict) => (
                    <li
                      key={conflict.code}
                      className="flex items-start gap-2.5 rounded-lg border p-3 text-xs"
                      style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                      <div>
                        <p className="font-semibold">{conflict.title}</p>
                        <p style={{ color: 'var(--text-muted)' }}>{conflict.detail}</p>
                        <p className="mt-1 font-medium">Sugestão: {conflict.suggestion}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="audit-checklist-heading" className="space-y-2">
              <h3 id="audit-checklist-heading" className="text-sm font-bold">
                Checklist Detalhado
              </h3>
              <ul className="space-y-2">
                {audit.checklist_results.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-2.5 rounded-lg border p-3 text-xs"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    {item.passed ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-hidden="true" />
                    )}
                    <div>
                      <p className="font-semibold">
                        {item.label} <span style={{ color: 'var(--text-muted)' }}>({item.weight} pts)</span>
                      </p>
                      <p style={{ color: 'var(--text-muted)' }}>{item.details}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </dialog>
  );
}
