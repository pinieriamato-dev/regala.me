import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';

export const runtime = 'edge';

export async function GET(_req: NextRequest, { params }: { params: { itemId: string } }) {
  const supabase = createServerSupabase();
  const { data: item } = await supabase.from('items').select('url').eq('id', params.itemId).single();
  if (!item?.url) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await supabase.from('outbound_clicks').insert({ item_id: params.itemId });
  return NextResponse.redirect(item.url, 302);
}
