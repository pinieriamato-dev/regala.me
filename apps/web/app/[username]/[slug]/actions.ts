'use server'

import { createHash, randomUUID } from 'node:crypto'
import { headers } from 'next/headers'
import { createServerSupabase } from '@/lib/supabase/server'
import { z } from 'zod'

type ClaimState = { error?: string; success?: boolean; releaseToken?: string | null } | null

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
    .select('id, wishlist_id, wishlists!inner(privacy_level)')
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

  return { success: true, releaseToken: tokenSaved ? releaseToken : null }
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
