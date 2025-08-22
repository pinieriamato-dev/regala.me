import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const body = await req.json();
  if (body.orderId) {
    await supabase.from('giftcard_orders').update({ payment_status: 'paid' }).eq('id', body.orderId);
  }
  return NextResponse.json({ ok: true });
}
