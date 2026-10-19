'use server'

import { createHash, randomUUID } from 'node:crypto'
import { headers } from 'next/headers'
import { after } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { notifyOwnerOfClaim } from '@/lib/notify-owner'
import { z } from 'zod'
import { trackEvent } from '@/lib/analytics'
import { createColectaCheckout, mercadoPagoEnabled } from '@/lib/mercadopago'

type ClaimState = { error?: string; success?: boolean; releaseToken?: string | null } | null
type ColectaState = { error?: string; redirectTo?: string } | null

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://regala.me'
const COLECTA_MIN_ARS = 100
// Same shape the gifter page uses for its path: /{username}/{slug}, username possibly percent-encoded.
const RETURN_PATH_RE = /^\/[\w%+.-]+\/[\w-]+$/

// Gifters type a free-text name; keep it a plausible human name, not a link or markup.
const nameSchema = z
  .string()
  .transform(v => v.replace(/\s+/g, ' ').trim())
  .pipe(
    z.string()
      .min(2, 'Escribí tu nombre.')
      .max(60, 'El nombre es muy largo.')
      .refine(v => /\p{L}/u.test(v), 'Escribí tu nombre.')
      .refine(v => !/[<>]|:\/\/|www\.|https?:/i.test(v) && !/\p{Cc}/u.test(v), 'Escribí solo tu nombre.')
  )

const claimSchema = z.object({
  item_id: z.string().uuid(),
  name: nameSchema,
})

// Best-effort per-IP limit. It lives in each function instance's memory, so it slows a script down
// rather than stopping a distributed one; the per-list check below is enforced against the DB.
const IP_WINDOW_MS = 10 * 60_000
const IP_MAX_CLAIMS = 6
const LIST_WINDOW_MS = 60_000
const LIST_MAX_CLAIMS = 10
const claimsByIp = new Map<string, number[]>()

function ipAllowed(ip: string): boolean {
  const now = Date.now()
  const recent = (claimsByIp.get(ip) ?? []).filter(t => now - t < IP_WINDOW_MS)
  if (recent.length >= IP_MAX_CLAIMS) {
    claimsByIp.set(ip, recent)
    return false
  }
  recent.push(now)
  claimsByIp.set(ip, recent)
  if (claimsByIp.size > 5000) {
    for (const [key, times] of claimsByIp) {
      if (times.every(t => now - t >= IP_WINDOW_MS)) claimsByIp.delete(key)
    }
  }
  return true
}

const TOO_MANY = 'Demasiados intentos. Esperá unos minutos y probá de nuevo.'

// Must match the SQL side: encode(sha256(convert_to(token, 'UTF8')), 'hex')
function hashReleaseToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export async function claimItem(_prevState: ClaimState, formData: FormData): Promise<ClaimState> {
  const parsed = claimSchema.safeParse({
    item_id: formData.get('item_id'),
    name: formData.get('name') ?? '',
  })
  if (!parsed.success) {
    const nameIssue = parsed.error.issues.find(i => i.path[0] === 'name')
    return { error: nameIssue?.message ?? 'Datos inválidos.' }
  }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  if (!ipAllowed(ip)) return { error: TOO_MANY }

  const supabase = await createServerSupabase()

  const { data: item } = await supabase
    .from('items')
    .select('id, title, wishlist_id, wishlists!inner(privacy_level)')
    .eq('id', parsed.data.item_id)
    .in('wishlists.privacy_level', ['public', 'link_only'])
    .single()

  if (!item) return { error: 'No se pudo reclamar el regalo. Intentá de nuevo.' }

  const { count: recentOnList, error: countError } = await supabase
    .from('claims')
    .select('id, items!inner(wishlist_id)', { count: 'exact', head: true })
    .eq('items.wishlist_id', item.wishlist_id)
    .gte('created_at', new Date(Date.now() - LIST_WINDOW_MS).toISOString())
  // Fail open if the count can't be read: a broken limiter must not block real gifters.
  if (!countError && (recentOnList ?? 0) >= LIST_MAX_CLAIMS) return { error: TOO_MANY }

  // An open colecta means several gifters are chipping in: a whole-item claim would clash with it.
  const { count: colectaCount, error: colectaError } = await supabase
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('item_id', parsed.data.item_id)
    .eq('is_group_gift', true)
  if (!colectaError && (colectaCount ?? 0) > 0) {
    return { error: 'Este regalo se está colectando entre varios. Sumá un aporte.' }
  }

  // The gifter keeps the raw token (localStorage) to undo their claim; the DB only stores its hash.
  const releaseToken = randomUUID()
  let { error } = await supabase.from('claims').insert({
    item_id: parsed.data.item_id,
    claimer_name: parsed.data.name,
    release_token_hash: hashReleaseToken(releaseToken),
  })
  let tokenSaved = true

  // Column not migrated yet (docs/sql/2026-10-19-claim-release.sql): claim without undo support.
  if (error?.code === 'PGRST204') {
    tokenSaved = false
    ;({ error } = await supabase.from('claims').insert({
      item_id: parsed.data.item_id,
      claimer_name: parsed.data.name,
    }))
  }

  if (error) {
    if (error.code === '23505') return { error: '¡Ya alguien lo reclamó! Elegí otro regalo.' }
    return { error: 'No se pudo reclamar el regalo. Intentá de nuevo.' }
  }

  // Gifters are anonymous, so events group by list rather than by person.
  trackEvent('item_claimed', `list:${item.wishlist_id}`, { wishlist_id: item.wishlist_id })

  after(() => notifyOwnerOfClaim({
    listId: item.wishlist_id,
    itemTitle: item.title,
    claimerName: parsed.data.name,
  }))

  return { success: true, releaseToken: tokenSaved ? releaseToken : null }
}

// Group gift: several gifters pay a share through Mercado Pago. The claim row is only written once the
// webhook confirms the payment, so a pending or abandoned checkout never shows up as a contribution.
export async function startColecta(_prevState: ColectaState, formData: FormData): Promise<ColectaState> {
  if (!mercadoPagoEnabled()) return { error: 'Las colectas todavía no están disponibles.' }

  const itemId = z.string().uuid().safeParse(formData.get('item_id'))
  if (!itemId.success) return { error: 'No se pudo aportar. Intentá de nuevo.' }

  const name = nameSchema.safeParse(formData.get('name') ?? '')
  if (!name.success) return { error: name.error.issues[0]?.message ?? 'Escribí tu nombre.' }

  // LATAM thousands separators are fine ("5.000"); decimals are not, since Mercado Pago gets whole pesos.
  const amountDigits = String(formData.get('amount') ?? '').replace(/[.\s]/g, '')
  if (!/^\d{1,9}$/.test(amountDigits)) return { error: 'Poné un monto en pesos, sin centavos.' }
  const amount = Number(amountDigits)
  if (amount < COLECTA_MIN_ARS) return { error: `El aporte mínimo es $${COLECTA_MIN_ARS}.` }

  const returnPath = String(formData.get('return_path') ?? '')
  if (!RETURN_PATH_RE.test(returnPath)) return { error: 'No se pudo aportar. Intentá de nuevo.' }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  if (!ipAllowed(ip)) return { error: TOO_MANY }

  const supabase = await createServerSupabase()

  // Surprise lists never show money raised, and colectas on them would leak it, so they are out.
  const { data: item } = await supabase
    .from('items')
    .select('id, title, price, wishlist_id, wishlists!inner(privacy_level, is_surprise, currency)')
    .eq('id', itemId.data)
    .in('wishlists.privacy_level', ['public', 'link_only'])
    .single()

  // The embedded list is a single row (many-to-one), though the generated types read it as an array.
  const list = item?.wishlists as unknown as { is_surprise: boolean; currency: string } | undefined
  if (!item || !item.price || !list || list.is_surprise || list.currency !== 'ARS') {
    return { error: 'No se pudo aportar a esta colecta.' }
  }

  const { count: claimedCount } = await supabase
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('item_id', item.id)
    .eq('is_group_gift', false)
  if ((claimedCount ?? 0) > 0) return { error: '¡Ya alguien lo reclamó entero!' }

  const { data: contributions } = await supabase
    .from('claims')
    .select('contribution_amount')
    .eq('item_id', item.id)
    .eq('is_group_gift', true)
  const raised = (contributions ?? []).reduce((sum: number, c: { contribution_amount: number | null }) =>
    sum + Number(c.contribution_amount ?? 0), 0)
  const remaining = Math.ceil(Number(item.price) - raised)
  if (remaining <= 0) return { error: '¡Ya llegaron al monto del regalo!' }
  if (amount > remaining) return { error: `Lo que falta es $${remaining.toLocaleString('es-AR')}.` }

  try {
    const redirectTo = await createColectaCheckout({
      itemId: item.id,
      itemTitle: item.title,
      amount,
      metadata: {
        item_id: item.id,
        wishlist_id: item.wishlist_id,
        claimer_name: name.data,
        amount,
      },
      returnUrl: `${SITE_URL}${returnPath}`,
      siteUrl: SITE_URL,
    })
    return { redirectTo }
  } catch (err) {
    console.error('Colecta checkout failed', err)
    return { error: 'No pudimos abrir el pago. Intentá de nuevo.' }
  }
}

export async function releaseClaim(itemId: string, token: string): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(itemId).success || !z.string().uuid().safeParse(token).success) {
    return { error: 'No se pudo deshacer.' }
  }

  const supabase = await createServerSupabase()
  const { data: released, error } = await supabase.rpc('release_claim', {
    p_item_id: itemId,
    // Raw token, hashed in SQL: the hashes are readable, so accepting one would let anyone release.
    p_token: token,
  })

  if (error || !released) return { error: 'No se pudo deshacer. Puede que ya se haya liberado.' }
  return {}
}
