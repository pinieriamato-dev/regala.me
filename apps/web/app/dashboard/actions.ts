'use server'

import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSlug } from 'shared'
import { z } from 'zod'

const createWishlistSchema = z.object({
  title:         z.string().min(1, 'El nombre es obligatorio').max(120),
  occasion:      z.string().max(50).optional().transform(v => v || null),
  occasion_date: z.string().max(20).optional().transform(v => v || null),
  currency:      z.enum(['ARS','BRL','MXN','CLP','COP','UYU','PEN','USD']).default('ARS'),
  is_surprise:   z.boolean().default(false),
  privacy_level: z.enum(['public','link_only','private']).default('public'),
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

  revalidatePath('/dashboard')
  return { redirectTo: `/dashboard/${list.id}` }
}

export async function updateProfile(_prevState: { error?: string } | null, formData: FormData): Promise<{ error?: string } | null> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const displayName = (formData.get('display_name') as string | null)?.trim() || null
  const bio         = (formData.get('bio') as string | null)?.trim() || null
  const birthdayRaw = (formData.get('birthday') as string | null)?.trim() || null
  const avatarUrl   = (formData.get('avatar_url') as string | null)?.trim() || null

  const birthday = birthdayRaw && /^\d{4}-\d{2}-\d{2}$/.test(birthdayRaw) ? birthdayRaw : null

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName, bio, birthday, avatar_url: avatarUrl || undefined })
    .eq('id', user.id)

  if (error) return { error: 'No se pudo guardar el perfil.' }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/profile')
  return null
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

export async function updatePrivacy(listId: string, privacyLevel: 'public' | 'link_only' | 'private') {
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

export async function mergeWishlists(sourceId: string, targetId: string) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // Verify the user owns both lists
  const { data: owned } = await supabase
    .from('wishlists').select('id').eq('owner_id', user.id).in('id', [sourceId, targetId])
  if (!owned || owned.length !== 2) return

  // Find the position to append source items after target items
  const { count: targetCount } = await supabase
    .from('items').select('id', { count: 'exact', head: true }).eq('wishlist_id', targetId)

  const { data: sourceItems } = await supabase
    .from('items').select('id').eq('wishlist_id', sourceId).order('sort_order')

  if (sourceItems?.length) {
    const offset = targetCount ?? 0
    await Promise.all(
      sourceItems.map((item, i) =>
        supabase.from('items')
          .update({ wishlist_id: targetId, sort_order: offset + i })
          .eq('id', item.id)
      )
    )
  }

  await supabase.from('wishlists').delete().eq('id', sourceId).eq('owner_id', user.id)
  revalidatePath('/dashboard')
}

export async function deleteWishlist(id: string) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  await supabase.from('wishlists').delete().eq('id', id).eq('owner_id', user.id)

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function addItem(listId: string, formData: FormData) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: ownedList } = await supabase
    .from('wishlists').select('id').eq('id', listId).eq('owner_id', user.id).single()
  if (!ownedList) return

  const parsed = addItemSchema.safeParse({
    title:       formData.get('title'),
    description: formData.get('description'),
    price:       formData.get('price'),
    url:         formData.get('url'),
    image_url:   formData.get('image_url'),
    priority:    formData.get('priority'),
  })
  if (!parsed.success) return

  const { data: topItem } = await supabase
    .from('items')
    .select('sort_order')
    .eq('wishlist_id', listId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  await supabase.from('items').insert({
    wishlist_id: listId,
    ...parsed.data,
    sort_order: (topItem?.sort_order ?? -1) + 1,
  })

  revalidatePath(`/dashboard/${listId}`)
}

export async function editItem(itemId: string, listId: string, formData: FormData) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: ownedList } = await supabase
    .from('wishlists').select('id').eq('id', listId).eq('owner_id', user.id).single()
  if (!ownedList) return

  const parsed = addItemSchema.safeParse({
    title:       formData.get('title'),
    description: formData.get('description'),
    price:       formData.get('price'),
    url:         formData.get('url'),
    image_url:   formData.get('image_url'),
    priority:    formData.get('priority'),
  })
  if (!parsed.success) return

  await supabase.from('items').update({
    title:       parsed.data.title,
    description: parsed.data.description,
    price:       parsed.data.price,
    url:         parsed.data.url,
    image_url:   parsed.data.image_url,
    priority:    parsed.data.priority,
  }).eq('id', itemId).eq('wishlist_id', listId)

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
