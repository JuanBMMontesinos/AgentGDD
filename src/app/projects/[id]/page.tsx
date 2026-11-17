import { redirect } from 'next/navigation';
import { GddStudioWorkspace } from '@/components/GddStudioWorkspace';
import { Navbar } from '@/components/Navbar';
import { hydrateProjectDetail } from '@/lib/supabase/project-helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Authenticated GDD Studio workspace page for a specific project.
 */
export default async function ProjectStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ autogen?: string }>;
}) {
  const { id } = await params;
  const { autogen } = await searchParams;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const detail = await hydrateProjectDetail(supabase, id);
  if (!detail) {
    redirect('/');
  }

  return (
    <div className="min-h-dvh">
      <Navbar userEmail={user.email} />
      <main id="main-content">
        <GddStudioWorkspace
          initialDetail={detail}
          autoGenerateOnMount={autogen === '1'}
        />
      </main>
    </div>
  );
}
