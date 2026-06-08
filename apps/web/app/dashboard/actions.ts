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
    const n = Number(v)
    return isNaN(n) ? null : n
  }),
  url: z.string().max(2000).optional().transform(v => {
    if (!v) return null
    return /^https?:\/\//i.test(v) ? v : null
  }),
  priority: z.coerce.number().int().min(1).max(3).default(1),
})

export type CreateWishlistResult = { error: string } | null

export async function createWishlist(_prevState: CreateWishlistResult, formData: FormData): Promise<CreateWishlistResult> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const parsed = createWishlistSchema.safeParse({
    title:         formData.get('title'),
    occasion:      formData.get('occasion'),
    occasion_date: formData.get('occasion_date'),
    currency:      formData.get('currency'),
    is_surprise:   formData.get('is_surprise') === 'on',
    privacy_level: formData.get('privacy_level'),
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
      is_public: privacy_level !== 'private',
      privacy_level,
    })
    .select('id')
    .single()

  if (error) return { error: 'No se pudo crear la lista. Intentá de nuevo.' }

  revalidatePath('/dashboard')
  redirect(`/dashboard/${list.id}`)
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
