'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { GddEntityRecord, GddEntityType } from '@/types/gdd';

interface EntityTableEditorProps {
  projectId: string;
  entities: GddEntityRecord[];
  readOnly?: boolean;
  onChanged: () => Promise<void>;
}

const ENTITY_TABS: Array<{ type: GddEntityType; label: string; defaultAttrs: string }> = [
  { type: 'enemy', label: 'Inimigos', defaultAttrs: 'Tipo: Melee, Vida: 60, Dano: 12, Loot: 25 XP' },
  { type: 'boss', label: 'Bosses', defaultAttrs: 'Fases: 2, HP: 1200, Mecânica: Escudo Térmico' },
  { type: 'equipment', label: 'Equipamentos', defaultAttrs: 'Tipo: Arma, Stats: +15 ATK, Raridade: Rara' },
  { type: 'skill', label: 'Skills', defaultAttrs: 'Tipo: Ativa, Custo: 20 Energia, Cooldown: 6s' },
  { type: 'roadmap_phase', label: 'Roadmap', defaultAttrs: 'Duração: 3 meses, Equipe: 4 pessoas' },
  { type: 'asset_estimate', label: 'Manifesto Assets', defaultAttrs: 'Quantidade: 20, Prioridade: P0' },
  { type: 'risk_item', label: 'Riscos', defaultAttrs: 'Impacto: Alto, Mitigação: Vertical Slice' },
];

/**
 * Interactive structured entity explorer and editor synced with Supabase `gdd_entities`.
 */
export function EntityTableEditor({
  projectId,
  entities,
  readOnly = false,
  onChanged,
}: EntityTableEditorProps) {
  const [activeType, setActiveType] = useState<GddEntityType>('enemy');
  const [newName, setNewName] = useState('');
  const [newAttrsText, setNewAttrsText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = entities.filter((e) => e.entity_type === activeType);
  const currentTab = ENTITY_TABS.find((t) => t.type === activeType) ?? ENTITY_TABS[0];

  const allAttrKeys = Array.from(
    new Set(filtered.flatMap((item) => Object.keys(item.attributes ?? {})))
  );

  async function handleAddEntity(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setSubmitting(true);
    try {
      const attrs: Record<string, string> = {};
      for (const pair of (newAttrsText || currentTab.defaultAttrs).split(',')) {
        const [k, ...rest] = pair.split(':');
        if (k && rest.length > 0) {
          attrs[k.trim()] = rest.join(':').trim();
        }
      }

      const res = await fetch(`/api/projects/${projectId}/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: activeType,
          name: newName.trim(),
          attributes: attrs,
          sort_order: filtered.length,
        }),
      });

      if (res.ok) {
        setNewName('');
        setNewAttrsText('');
        await onChanged();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(entityId: string) {
    await fetch(`/api/projects/${projectId}/entities/${entityId}`, {
      method: 'DELETE',
    });
    await onChanged();
  }

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Categorias de entidades" className="flex flex-wrap gap-2">
        {ENTITY_TABS.map((tab) => {
          const count = entities.filter((e) => e.entity_type === tab.type).length;
          const selected = activeType === tab.type;
          return (
            <button
              key={tab.type}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveType(tab.type)}
              className="min-h-9 rounded-lg border px-3 py-1.5 text-xs font-semibold transition"
              style={{
                borderColor: selected ? 'var(--brand)' : 'var(--border-subtle)',
                backgroundColor: selected ? 'var(--brand)' : 'var(--bg-elevated)',
                color: selected ? 'var(--brand-contrast)' : 'var(--text-primary)',
              }}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {!readOnly && (
        <form
          onSubmit={handleAddEntity}
          className="grid grid-cols-1 gap-3 rounded-xl border p-3 sm:grid-cols-12"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-elevated)',
          }}
        >
          <div className="sm:col-span-4">
            <label htmlFor="entity-name-input" className="mb-1 block text-xs font-medium">
              Nome ({currentTab.label})
            </label>
            <input
              id="entity-name-input"
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Drone Sentinela"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            />
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="entity-attrs-input" className="mb-1 block text-xs font-medium">
              Atributos (chave: valor, separados por vírgula)
            </label>
            <input
              id="entity-attrs-input"
              type="text"
              value={newAttrsText}
              onChange={(e) => setNewAttrsText(e.target.value)}
              placeholder={currentTab.defaultAttrs}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            />
          </div>

          <div className="flex items-end sm:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
              style={{
                backgroundColor: 'var(--brand)',
                color: 'var(--brand-contrast)',
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Adicionar</span>
            </button>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-xl border p-6 text-center text-sm" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
          Nenhuma entidade registrada em <strong>{currentTab.label}</strong> ainda. Gere o GDD ou adicione manualmente acima.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-subtle)' }}>
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">Tabela estruturada de {currentTab.label}</caption>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <th scope="col" className="border-b px-3 py-2.5 font-semibold" style={{ borderColor: 'var(--border-subtle)' }}>
                  Nome
                </th>
                {allAttrKeys.map((key) => (
                  <th
                    key={key}
                    scope="col"
                    className="border-b px-3 py-2.5 font-semibold"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    {key}
                  </th>
                ))}
                {!readOnly && (
                  <th scope="col" className="border-b px-3 py-2.5 text-right font-semibold" style={{ borderColor: 'var(--border-subtle)' }}>
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
                  <th scope="row" className="px-3 py-2.5 font-medium">
                    {item.name}
                  </th>
                  {allAttrKeys.map((key) => (
                    <td key={key} className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {String(item.attributes?.[key] ?? '—')}
                    </td>
                  ))}
                  {!readOnly && (
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        aria-label={`Remover ${item.name}`}
                        className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs hover:opacity-80"
                        style={{ borderColor: 'var(--border-subtle)', color: 'var(--danger)' }}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
