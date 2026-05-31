import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { CreateWishlistSchema } from 'shared/schemas';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const json = await req.json();
  const data = CreateWishlistSchema.parse(json);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { data: wishlist, error } = await supabase
    .from('wishlists')
    .insert({ owner: user.id, ...data })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(wishlist);
}
