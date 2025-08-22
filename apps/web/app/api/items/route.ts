import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { CreateItemSchema } from 'shared/schemas';
import { parseOG } from '@/src/lib/og';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const json = await req.json();
  const data = CreateItemSchema.parse(json);
  let meta: any = {};
  if (data.url) {
    meta = await parseOG(data.url);
  }
  const { data: item, error } = await supabase
    .from('items')
    .insert({
      wishlist_id: data.wishlistId,
      url: data.url,
      title: data.title ?? meta.title,
      image_url: meta.image,
      price: meta.price,
      currency: meta.currency,
      note: data.note
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(item);
}
