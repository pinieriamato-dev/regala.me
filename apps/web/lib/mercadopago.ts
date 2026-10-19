// Mercado Pago Checkout Pro for group gifts (colectas). Server-only.
// Off unless MP_ACCESS_TOKEN is set: colectas then show no button and the webhook refuses payments.

const MP_API = 'https://api.mercadopago.com'

export type ColectaMetadata = {
  item_id: string
  wishlist_id: string
  claimer_name: string
  amount: number
}

export type MercadoPagoPayment = {
  id: number
  status: string
  currency_id: string
  transaction_amount: number
  external_reference: string | null
  metadata: Partial<ColectaMetadata>
}

export function mercadoPagoEnabled(): boolean {
  return !!process.env.MP_ACCESS_TOKEN
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

// Creates a one-off payment link for one contribution. Returns the URL the gifter is sent to.
export async function createColectaCheckout(input: {
  itemId: string
  itemTitle: string
  amount: number
  metadata: ColectaMetadata
  returnUrl: string
  siteUrl: string
}): Promise<string> {
  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      items: [{
        id: input.itemId,
        title: `Colecta: ${input.itemTitle}`.slice(0, 250),
        quantity: 1,
        unit_price: input.amount,
        currency_id: 'ARS',
      }],
      external_reference: input.itemId,
      metadata: input.metadata,
      back_urls: {
        success: `${input.returnUrl}?colecta=ok`,
        pending: `${input.returnUrl}?colecta=pending`,
        failure: `${input.returnUrl}?colecta=failed`,
      },
      auto_return: 'approved',
      notification_url: `${input.siteUrl}/api/mercadopago/webhook`,
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Mercado Pago preference failed: ${res.status}`)
  const body = await res.json() as { init_point?: string }
  if (!body.init_point) throw new Error('Mercado Pago preference has no init_point')
  return body.init_point
}

// Never trust the webhook body: the payment is re-read from Mercado Pago with our token.
export async function fetchPayment(id: string): Promise<MercadoPagoPayment | null> {
  const res = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(id)}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(8000),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Mercado Pago payment lookup failed: ${res.status}`)
  return await res.json() as MercadoPagoPayment
}
