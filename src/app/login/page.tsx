'use client';

import { Gamepad2, Lock, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

/**
 * Supabase Authentication page (Option B: required sign-in / sign-up before accessing Studio projects).
 */
export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();

      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setErrorMsg(error.message);
          return;
        }
        window.location.assign('/');
        return;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) {
          setErrorMsg(error.message);
          return;
        }
        if (data.session) {
          window.location.assign('/');
          return;
        } else {
          setInfoMsg(
            'Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.'
          );
        }
      }
    } catch {
      setErrorMsg('Falha inesperada ao autenticar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh">
      <Navbar />
      <main id="main-content" className="mx-auto flex max-w-md flex-col justify-center px-4 py-14">
        <div
          className="rounded-2xl border p-6 shadow-sm"
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div className="mb-6 text-center">
            <span
              className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--brand)', color: 'var(--brand-contrast)' }}
            >
              <Gamepad2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-extrabold">Entrar no AgentGDD</h1>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Autenticação via Supabase Auth para salvar, versionar e auditar seus GDDs.
            </p>
          </div>

          <div role="tablist" aria-label="Modo de autenticação" className="mb-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => setMode('login')}
              className="min-h-9 rounded-lg border text-xs font-bold"
              style={{
                borderColor: mode === 'login' ? 'var(--brand)' : 'var(--border-subtle)',
                backgroundColor: mode === 'login' ? 'var(--brand)' : 'var(--bg-elevated)',
                color: mode === 'login' ? 'var(--brand-contrast)' : 'var(--text-primary)',
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => setMode('signup')}
              className="min-h-9 rounded-lg border text-xs font-bold"
              style={{
                borderColor: mode === 'signup' ? 'var(--brand)' : 'var(--border-subtle)',
                backgroundColor: mode === 'signup' ? 'var(--brand)' : 'var(--bg-elevated)',
                color: mode === 'signup' ? 'var(--brand-contrast)' : 'var(--text-primary)',
              }}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={handleSubmit} data-hydrated={hydrated ? 'true' : 'false'} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                <span>E-mail</span>
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={errorMsg ? 'true' : 'false'}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="mb-1 flex items-center gap-1.5 text-xs font-semibold">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Senha</span>
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={errorMsg ? 'true' : 'false'}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-elevated)' }}
              />
            </div>

            {errorMsg && (
              <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-400">
                {errorMsg}
              </p>
            )}

            {infoMsg && (
              <p role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                {infoMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="min-h-10 w-full rounded-xl px-4 py-2.5 text-sm font-bold transition hover:opacity-90 disabled:opacity-60"
              style={{
                backgroundColor: 'var(--brand)',
                color: 'var(--brand-contrast)',
              }}
            >
              {loading
                ? 'Processando...'
                : mode === 'login'
                  ? 'Acessar Studio'
                  : 'Cadastrar e Entrar'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
