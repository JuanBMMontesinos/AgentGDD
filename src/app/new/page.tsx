import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { NewGddWizard } from '@/components/NewGddWizard';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { GddTemplateRecord } from '@/types/gdd';

export const dynamic = 'force-dynamic';

/**
 * Dedicated `/new` route hosting the 3-step progressive-disclosure GDD Creation Wizard.
 */
export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template } = await searchParams;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: templates } = await supabase
    .from('gdd_templates')
    .select('*')
    .order('sort_order', { ascending: true });

  return (
    <div className="min-h-dvh">
      <Navbar userEmail={user.email} />
      <main id="main-content" className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Voltar para Meus Projetos</span>
          </Link>
        </div>

        <NewGddWizard
          templates={(templates ?? []) as GddTemplateRecord[]}
          initialTemplateSlug={template}
        />
      </main>
    </div>
  );
}
