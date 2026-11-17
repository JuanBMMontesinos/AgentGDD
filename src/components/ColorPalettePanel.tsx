'use client';

import { Copy, Check } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { extractColorSwatches, getContrastTextColor } from '@/lib/gdd/parser';
import type { GddEntityRecord } from '@/types/gdd';

interface ColorPalettePanelProps {
  section4Markdown: string;
  entities: GddEntityRecord[];
}

/**
 * Displays live HEX color swatches extracted from Section 4 or structured entities,
 * using contrast-safe foreground text and one-click HEX copy.
 */
export function ColorPalettePanel({ section4Markdown, entities }: ColorPalettePanelProps) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const entitySwatches = entities
    .filter((e) => e.entity_type === 'color_swatch')
    .map((e) => ({
      name: e.name,
      hex: String(e.attributes.hex ?? '#0EA5E9').toUpperCase(),
      usage: String(e.attributes.usage ?? 'Paleta do projeto'),
    }));

  const swatches =
    entitySwatches.length > 0 ? entitySwatches : extractColorSwatches(section4Markdown);

  if (swatches.length === 0) {
    return null;
  }

  async function copyHex(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex(null), 1500);
    } catch {
      // Clipboard unavailable in headless environments
    }
  }

  return (
    <section
      aria-labelledby="palette-heading"
      className="mt-6 rounded-xl border p-4"
      style={{
        borderColor: 'var(--border-subtle)',
        backgroundColor: 'var(--bg-elevated)',
      }}
    >
      <h3 id="palette-heading" className="mb-3 text-sm font-bold uppercase tracking-wide">
        Paleta HEX Visual (Seção 4)
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {swatches.map((swatch) => {
          const fg = getContrastTextColor(swatch.hex);
          const styleVars = {
            '--swatch-bg': swatch.hex,
            '--swatch-fg': fg,
          } as CSSProperties;

          return (
            <div
              key={`${swatch.name}-${swatch.hex}`}
              className="flex flex-col justify-between overflow-hidden rounded-lg border"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div
                className="swatch-badge flex items-center justify-between px-3 py-4 font-mono text-xs font-bold"
                style={styleVars}
              >
                <span>{swatch.hex}</span>
                <button
                  type="button"
                  onClick={() => copyHex(swatch.hex)}
                  aria-label={`Copiar código ${swatch.hex}`}
                  className="inline-flex min-h-7 items-center gap-1 rounded px-2 py-1 text-[11px] underline-offset-2 hover:underline"
                  style={{ color: fg }}
                >
                  {copiedHex === swatch.hex ? (
                    <>
                      <Check className="h-3 w-3" aria-hidden="true" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" aria-hidden="true" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold">{swatch.name}</p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {swatch.usage}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
