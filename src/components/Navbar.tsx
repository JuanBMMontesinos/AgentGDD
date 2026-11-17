'use client';

import { Gamepad2, LogOut, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

interface NavbarProps {
  userEmail?: string | null;
}

/**
 * Primary studio navigation bar with authentication state and theme switcher.
 */
export function Navbar({ userEmail }: NavbarProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header
      className="no-print border-b"
      style={{
        borderColor: 'var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'var(--brand)', color: 'var(--brand-contrast)' }}
          >
            <Gamepad2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg">
            Agent<span style={{ color: 'var(--brand)' }}>GDD</span>
          </span>
        </Link>

        <nav aria-label="Principal" className="flex flex-wrap items-center gap-2.5">
          <ThemeToggle />

          {userEmail ? (
            <>
              <Link
                href="/#new-gdd-wizard"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
                style={{
                  backgroundColor: 'var(--brand)',
                  color: 'var(--brand-contrast)',
                }}
              >
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                <span>Novo GDD</span>
              </Link>

              <span
                className="hidden text-xs sm:inline"
                style={{ color: 'var(--text-muted)' }}
              >
                {userEmail}
              </span>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-90"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sair</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex min-h-9 items-center rounded-lg px-3.5 py-1.5 text-xs font-semibold"
              style={{
                backgroundColor: 'var(--brand)',
                color: 'var(--brand-contrast)',
              }}
            >
              Entrar no Studio
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
