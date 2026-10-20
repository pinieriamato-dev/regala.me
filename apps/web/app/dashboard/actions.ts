'use server'

import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSlug } from 'shared'
import { z } from 'zod'
import { trackEvent } from '@/lib/analytics'
import { parseEmail, parseInstagram, parsePhone, parseUsername } from '@/lib/profile-fields'

const createWishlistSchema = z.object({
  title:         z.string().min(1, 'El nombre es obligatorio').max(120),
  occasion:      z.string().max(50).optional().transform(v => v || null),
  occasion_date: z.string().max(20).optional().transform(v => v || null),
  currency:      z.enum(['ARS','BRL','MXN','CLP','COP','UYU','PEN','USD']).default('ARS'),
  is_surprise:   z.boolean().default(false),
  privacy_level: z.enum(['public','link_only','private','friends']).default('public'),
})

const addItemSchema = z.object({
  title:       z.string().min(1).max(200),
  description: z.string().max(500).optional().transform(v => v || null),
  price:       z.string().optional().transform(v => {
    if (!v) return null
    // Normalize LATAM number formats before parsing:
    // "66.500" (period = thousands separator in es-AR) → 66500
    // "66,5"   (comma = decimal separator in es-AR)   → 66.5
    // "1.234,56"                                       → 1234.56
    let s = v.trim().replace(/[^\d.,]/g, '')
    if (!s) return null
    const lastComma = s.lastIndexOf(',')
    const lastDot   = s.lastIndexOf('.')
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.')        // comma is decimal
    } else if (lastDot > -1 && lastComma === -1 && s.slice(lastDot + 1).length === 3) {
      s = s.replace(/\./g, '')                          // period is thousands
    } else if (lastComma > -1 && lastDot > lastComma) {
      s = s.replace(/,/g, '')                           // comma is thousands
    }
    const n = Number(s)
    return isNaN(n) || n < 0 ? null : n
  }),
  url: z.string().max(2000).optional().transform(v => {
    if (!v) return null
    return /^https?:\/\//i.test(v) ? v : null
  }),
  image_url: z.string().max(2000).optional().transform(v => {
    if (!v) return null
    return /^https?:\/\//i.test(v) ? v : null
  }),
  priority: z.coerce.number().int().min(1).max(3).default(1),
})

export type CreateWishlistResult = { error: string } | { redirectTo: string } | null

export async function createWishlist(_prevState: CreateWishlistResult, formData: FormData): Promise<CreateWishlistResult> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const parsed = createWishlistSchema.safeParse({
    title:         formData.get('title') ?? undefined,
    occasion:      formData.get('occasion') ?? undefined,
    occasion_date: formData.get('occasion_date') ?? undefined,
    currency:      formData.get('currency') ?? undefined,
    is_surprise:   formData.get('is_surprise') === 'on',
    privacy_level: formData.get('privacy_level') ?? undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }

  const { title, occasion, occasion_date, currency, is_surprise, privacy_level } = parsed.data
  const slug = createSlug(title)

  const { data: list, error } = await supabase
    .from('wishlists')
    .insert({
      owner_id: user.id,
      title,
      slug,
      occasion,
      occasion_date,
      currency,
      is_surprise,
      privacy_level,
    })
    .select('id')
    .single()

  if (error) return { error: 'No se pudo crear la lista. Intentá de nuevo.' }

  trackEvent('list_created', user.id, { occasion, currency, is_surprise, privacy_level })
  revalidatePath('/dashboard')
  return { redirectTo: `/dashboard/${list.id}` }
}

type ProfileState = { error?: string; notice?: string } | null

export async function updateProfile(_prevState: ProfileState, formData: FormData): Promise<ProfileState> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const displayName = (formData.get('display_name') as string | null)?.trim() || null
  const bio         = (formData.get('bio') as string | null)?.trim() || null
  const birthdayRaw = (formData.get('birthday') as string | null)?.trim() || null
  const avatarUrl   = (formData.get('avatar_url') as string | null)?.trim() || null

  const birthday = birthdayRaw && /^\d{4}-\d{2}-\d{2}$/.test(birthdayRaw) ? birthdayRaw : null

  const { data: current } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  const rawUsername = (formData.get('username') as string | null)?.trim() ?? ''
  const usernameChanged = rawUsername !== (current?.username ?? '')
  let username: string | undefined
  if (usernameChanged) {
    const parsed = parseUsername(rawUsername)
    if (!parsed.ok) return { error: parsed.error }
    const { data: taken } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', parsed.value)
      .neq('id', user.id)
      .maybeSingle()
    if (taken) return { error: 'Ese nombre de usuario ya está en uso.' }
    username = parsed.value
  }

  const instagram = parseInstagram((formData.get('instagram') as string | null) ?? '')
  if (!instagram.ok) return { error: instagram.error }
  const phone = parsePhone((formData.get('phone') as string | null) ?? '')
  if (!phone.ok) return { error: phone.error }

  const rawEmail = (formData.get('email') as string | null) ?? ''
  const email = parseEmail(rawEmail)
  if (!email.ok) return { error: email.error }
  const emailChanged = email.value !== (user.email ?? '').toLowerCase()

  const { error } = await supabase
    .from('profiles')
    .update({
      ...(username ? { username } : {}),
      display_name: displayName,
      bio,
      birthday,
      avatar_url: avatarUrl || undefined,
      instagram: instagram.value,
    })
    .eq('id', user.id)

  // 23505 = unique_violation: someone claimed the username between our check and this write.
  if (error) {
    return { error: error.code === '23505' ? 'Ese nombre de usuario ya está en uso.' : 'No se pudo guardar el perfil.' }
  }

  // Phone is private: stored in profile_contacts (owner-only RLS), never in the public profiles row.
  const { error: phoneError } = await supabase
    .from('profile_contacts')
    .upsert({ id: user.id, phone: phone.value }, { onConflict: 'id' })
  if (phoneError) return { error: 'No se pudo guardar el teléfono.' }

  // Supabase Auth sends a confirmation link to the new address; the old one stays active until it is clicked.
  let notice = 'Perfil guardado.'
  if (emailChanged) {
    const { error: emailError } = await supabase.auth.updateUser({ email: email.value })
    if (emailError) {
      return { error: 'El perfil se guardó, pero no se pudo cambiar el mail. Revisá que no esté en uso por otra cuenta.' }
    }
    notice += ' Te mandamos un mail a la dirección nueva. Confirmala para que el cambio quede activo.'
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/profile')
  if (username) revalidatePath(`/${username}`)
  return { notice }
}

export async function updateSurprise(listId: string, isSurprise: boolean) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  await supabase
    .from('wishlists')
    .update({ is_surprise: isSurprise })
    .eq('id', listId)
    .eq('owner_id', user.id)

  revalidatePath(`/dashboard/${listId}`)
}

export async function updatePrivacy(listId: string, privacyLevel: 'public' | 'link_only' | 'private' | 'friends') {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  await supabase
    .from('wishlists')
    .update({ privacy_level: privacyLevel })
    .eq('id', listId)
    .eq('owner_id', user.id)

  revalidatePath(`/dashboard/${listId}`)
}

export async function mergeWishlists(sourceId: string, targetId: string): Promise<{ error: string } | undefined> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const failed = { error: 'No se pudieron combinar las listas. No se borró nada; probá de nuevo.' }
  if (sourceId === targetId) return failed

  // Verify the user owns both lists
  const { data: owned } = await supabase
    .from('wishlists').select('id, is_default').eq('owner_id', user.id).in('id', [sourceId, targetId])
  if (!owned || owned.length !== 2) return failed

  // The source is deleted at the end, and the default list must always exist. It can still be the target.
  if (owned.some(l => l.id === sourceId && l.is_default)) {
    return { error: 'Tu lista principal no se puede combinar con otra. Combiná la otra lista dentro de ella.' }
  }

  const { data: topItem } = await supabase
    .from('items').select('sort_order').eq('wishlist_id', targetId)
    .order('sort_order', { ascending: false }).limit(1).maybeSingle()

  const { data: sourceItems, error: readError } = await supabase
    .from('items').select('id').eq('wishlist_id', sourceId).order('sort_order')
  if (readError) return failed

  // Move every item in a single UPDATE: one statement is atomic, so items are never split between lists.
  const { error: moveError } = await supabase
    .from('items').update({ wishlist_id: targetId }).eq('wishlist_id', sourceId)
  if (moveError) return failed

  // Append after the target's items. Best-effort: a failure here only affects order, never loses items.
  const base = (topItem?.sort_order ?? -1) + 1
  await Promise.all(
    (sourceItems ?? []).map((item, i) =>
      supabase.from('items').update({ sort_order: base + i }).eq('id', item.id)
    )
  )

  // Only delete the source once it's verifiably empty, so a failed move can never take items with it.
  const { count: left, error: countError } = await supabase
    .from('items').select('id', { count: 'exact', head: true }).eq('wishlist_id', sourceId)
  if (countError || left !== 0) return failed

  await supabase.from('wishlists').delete().eq('id', sourceId).eq('owner_id', user.id)
  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/${targetId}`)
  redirect(`/dashboard/${targetId}?merged=1`)
}

export async function deleteWishlist(id: string) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // The default list can't be deleted, only emptied. The UI hides the button, this is the real check.
  await supabase.from('wishlists').delete().eq('id', id).eq('owner_id', user.id).eq('is_default', false)

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function addItem(listId: string, formData: FormData): Promise<{ error?: string } | undefined> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: ownedList } = await supabase
    .from('wishlists').select('id').eq('id', listId).eq('owner_id', user.id).single()
  if (!ownedList) return { error: 'No se pudo agregar el ítem. Recargá la página e intentá de nuevo.' }

  const parsed = addItemSchema.safeParse({
    title:       formData.get('title'),
    description: formData.get('description'),
    price:       formData.get('price'),
    url:         formData.get('url'),
    image_url:   formData.get('image_url'),
    priority:    formData.get('priority'),
  })
  if (!parsed.success) return { error: 'Revisá los datos del ítem e intentá de nuevo.' }

  const { data: topItem } = await supabase
    .from('items')
    .select('sort_order')
    .eq('wishlist_id', listId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const { error: insertError } = await supabase.from('items').insert({
    wishlist_id: listId,
    ...parsed.data,
    sort_order: (topItem?.sort_order ?? -1) + 1,
  })

  if (insertError) return { error: 'No se pudo agregar el ítem. Intentá de nuevo.' }

  trackEvent('item_added', user.id, {
    priority: parsed.data.priority,
    has_price: parsed.data.price !== null,
    has_url: parsed.data.url !== null,
  })

  revalidatePath(`/dashboard/${listId}`)
}

export async function editItem(itemId: string, listId: string, formData: FormData): Promise<{ error?: string } | undefined> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: ownedList } = await supabase
    .from('wishlists').select('id').eq('id', listId).eq('owner_id', user.id).single()
  if (!ownedList) return { error: 'No se pudo guardar el ítem. Recargá la página e intentá de nuevo.' }

  const parsed = addItemSchema.safeParse({
    title:       formData.get('title'),
    description: formData.get('description'),
    price:       formData.get('price'),
    url:         formData.get('url'),
    image_url:   formData.get('image_url'),
    priority:    formData.get('priority'),
  })
  if (!parsed.success) return { error: 'Revisá los datos del ítem e intentá de nuevo.' }

  const { error: updateError } = await supabase.from('items').update({
    title:       parsed.data.title,
    description: parsed.data.description,
    price:       parsed.data.price,
    url:         parsed.data.url,
    image_url:   parsed.data.image_url,
    priority:    parsed.data.priority,
  }).eq('id', itemId).eq('wishlist_id', listId)
  if (updateError) return { error: 'No se pudo guardar el ítem. Intentá de nuevo.' }

  revalidatePath(`/dashboard/${listId}`)
}

export async function deleteItem(itemId: string, listId: string) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: ownedList } = await supabase
    .from('wishlists').select('id').eq('id', listId).eq('owner_id', user.id).single()
  if (!ownedList) return

  await supabase.from('items').delete().eq('id', itemId).eq('wishlist_id', listId)

  revalidatePath(`/dashboard/${listId}`)
}

export async function moveItem(itemId: string, listId: string, direction: 'up' | 'down') {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: ownedList } = await supabase
    .from('wishlists').select('id').eq('id', listId).eq('owner_id', user.id).single()
  if (!ownedList) return

  const { data: items } = await supabase
    .from('items').select('id, sort_order').eq('wishlist_id', listId)
    .order('sort_order').order('created_at')
  if (!items) return

  const index = items.findIndex((item) => item.id === itemId)
  const swapWith = direction === 'up' ? index - 1 : index + 1
  if (index === -1 || swapWith < 0 || swapWith >= items.length) return

  // Renumber the whole list. Swapping two values would do nothing if sort_order already has ties.
  const reordered = [...items]
  ;[reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]]
  await Promise.all(
    reordered
      .map((item, position) => ({ id: item.id, from: item.sort_order, to: position }))
      .filter((row) => row.from !== row.to)
      .map((row) => supabase.from('items').update({ sort_order: row.to }).eq('id', row.id))
  )

  revalidatePath(`/dashboard/${listId}`)
}

export async function releaseClaim(itemId: string, listId: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: ownedList } = await supabase
    .from('wishlists').select('id').eq('id', listId).eq('owner_id', user.id).single()
  if (!ownedList) return { error: 'No se pudo liberar.' }

  // SECURITY DEFINER function that checks ownership (docs/sql/2026-10-19-claim-release.sql).
  const { data: released, error } = await supabase.rpc('release_claim_as_owner', { p_item_id: itemId })
  if (error || !released) return { error: 'No se pudo liberar. Probá de nuevo.' }

  revalidatePath(`/dashboard/${listId}`)
  return {}
}
