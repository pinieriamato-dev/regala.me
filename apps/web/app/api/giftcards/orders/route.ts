import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { CreateGiftcardOrderSchema } from 'shared/schemas';
import { encrypt } from '@/src/lib/security';
import { sendEmail } from '@/src/lib/email';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  const json = await req.json();
  const data = CreateGiftcardOrderSchema.parse(json);
  const { data: order, error } = await supabase
    .from('giftcard_orders')
    .insert({
      product_id: data.productId,
      amount_cents: data.amountCents,
      currency: data.currency,
      recipient_email: data.recipientEmail,
      recipient_name: data.recipientName,
      message: data.message,
      wishlist_id: data.wishlistId,
      payment_status: 'paid'
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.from('giftcard_vouchers').insert({
    order_id: order.id,
    code_encrypted: encrypt('STUB-CODE-1234')
  });
  await sendEmail(data.recipientEmail, 'Tu gift card', `<p>Código: STUB-CODE-1234</p>`);
  return NextResponse.json({ ok: true });
}
