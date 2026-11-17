import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Lists all seeded genre starter templates ordered by display priority.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('gdd_templates')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: data ?? [] });
}
