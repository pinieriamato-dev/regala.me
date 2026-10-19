import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchPayment, mercadoPagoEnabled } from '@/lib/mercadopago'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Mercado Pago sends the payment id either in the query (IPN) or in the JSON body (webhooks).
function paymentIdFrom(request: NextRequest, body: unknown): string | null {
  const type = request.nextUrl.searchParams.get('type') ?? request.nextUrl.searchParams.get('topic')
  const queryId = request.nextUrl.searchParams.get('data.id') ?? request.nextUrl.searchParams.get('id')
  const b = (body ?? {}) as { type?: string; action?: string; data?: { id?: string | number } }
  const bodyType = b.type ?? b.action?.split('.')[0]
  if (bodyType !== 'payment' && type !== 'payment') return null
  const id = b.data?.id ?? queryId
  return id != null && /^\d+$/.test(String(id)) ? String(id) : null
}

// Records a colecta contribution once its payment is approved. Mercado Pago retries on non-2xx,
// so a missing config or a failed write answers 5xx and the payment is picked up again later.
export async function POST(request: NextRequest) {
  if (!mercadoPagoEnabled() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Colectas no configuradas' }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  const paymentId = paymentIdFrom(request, body)
  if (!paymentId) return Response.json({ ok: true, ignored: true })

  let payment
  try {
    payment = await fetchPayment(paymentId)
  } catch (err) {
    console.error('Colecta webhook: payment lookup failed', err)
    return Response.json({ error: 'Lookup failed' }, { status: 502 })
  }
  if (!payment) return Response.json({ ok: true, ignored: true })
  if (payment.status !== 'approved' || payment.currency_id !== 'ARS') return Response.json({ ok: true, ignored: true })

  const { item_id, claimer_name, amount } = payment.metadata ?? {}
  // The preference set these from our own colecta form; anything else is not one of ours.
  if (!item_id || !UUID_RE.test(item_id) || payment.external_reference !== item_id) {
    return Response.json({ ok: true, ignored: true })
  }
  if (!claimer_name || !Number.isInteger(amount) || amount! <= 0 || payment.transaction_amount !== amount) {
    return Response.json({ ok: true, ignored: true })
  }

  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const { error } = await admin.from('claims').insert({
    item_id,
    claimer_name,
    is_group_gift: true,
    contribution_amount: amount,
    mp_payment_id: String(payment.id),
  })

  // The same payment can be delivered twice; the unique mp_payment_id makes that a no-op.
  if (error && error.code !== '23505') {
    console.error('Colecta webhook: insert failed', error.code)
    return Response.json({ error: 'Insert failed' }, { status: 500 })
  }
  return Response.json({ ok: true })
}
