import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { sendEmail } from '@/src/lib/email';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabase();
  const { data: reservation } = await supabase
    .from('item_reservations')
    .update({ purchased: true })
    .eq('item_id', params.id)
    .eq('purchased', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .select('*, items(wishlist_id), wishlists!inner(owner,notify_on_purchase)')
    .single();
  if (reservation?.wishlists?.notify_on_purchase) {
    const { data: owner } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', reservation.wishlists.owner)
      .single();
    if (owner?.email) {
      await sendEmail(owner.email, 'Se compró un regalo', '<p>Alguien compró un regalo.</p>');
    }
  }
  return NextResponse.json({ ok: true });
}
