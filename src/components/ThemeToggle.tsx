'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type ThemeMode = 'system' | 'light' | 'dark';

/**
 * Accessible theme switcher syncing `data-theme` on `<html>` while respecting system preference.
 */
export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    const stored = window.localStorage.getItem('agentgdd-theme') as ThemeMode | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setMode(stored);
      applyTheme(stored);
    }
  }, []);

  function applyTheme(nextMode: ThemeMode) {
    if (nextMode === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', nextMode);
    }
  }

  function cycleTheme() {
    const order: ThemeMode[] = ['system', 'dark', 'light'];
    const next = order[(order.indexOf(mode) + 1) % order.length];
    setMode(next);
    window.localStorage.setItem('agentgdd-theme', next);
    applyTheme(next);
  }

  const label =
    mode === 'dark' ? 'Tema: Escuro' : mode === 'light' ? 'Tema: Claro' : 'Tema: Sistema';

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`Alternar tema (${label})`}
      className="inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-90"
      style={{
        borderColor: 'var(--border-subtle)',
        backgroundColor: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
      }}
    >
      {mode === 'dark' ? (
        <Moon className="h-3.5 w-3.5" aria-hidden="true" />
      ) : mode === 'light' ? (
        <Sun className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span>{label}</span>
    </button>
  );
}
