import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: { username: string; slug: string } }) {
  const supabase = createServerSupabase();
  const { data: list } = await supabase
    .from('wishlists')
    .select('*, profiles!inner(username)')
    .eq('slug', params.slug)
    .eq('profiles.username', params.username)
    .single();
  if (!list) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const { data: items } = await supabase
    .from('items')
    .select('*')
    .eq('wishlist_id', list.id)
    .order('sort_order');
  return NextResponse.json({ list, items });
}
