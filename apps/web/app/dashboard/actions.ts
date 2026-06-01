'use server'

import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSlug } from 'shared'

export async function createWishlist(formData: FormData) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const title         = formData.get('title') as string
  const occasion      = (formData.get('occasion') as string) || null
  const occasion_date = (formData.get('occasion_date') as string) || null
  const currency      = (formData.get('currency') as string) || 'ARS'
  const is_surprise    = formData.get('is_surprise') === 'on'
  const privacy_level  = (formData.get('privacy_level') as string) || 'public'

  const slug = createSlug(title)

  const { data: list, error } = await supabase
    .from('wishlists')
    .insert({
      owner_id: user.id,
      title,
      slug,
      occasion,
      occasion_date: occasion_date || null,
      currency,
      is_surprise,
      is_public: privacy_level !== 'private',
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

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

  const title       = formData.get('title') as string
  const description = (formData.get('description') as string) || null
  const priceRaw    = formData.get('price') as string
  const price       = priceRaw ? Number(priceRaw) : null
  const rawUrl      = (formData.get('url') as string) || null
  const url         = rawUrl && /^https?:\/\//i.test(rawUrl) ? rawUrl : null
  const priority    = Number(formData.get('priority') || '1')

  const { data: topItem } = await supabase
    .from('items')
    .select('sort_order')
    .eq('wishlist_id', listId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const sort_order = (topItem?.sort_order ?? -1) + 1

  await supabase.from('items').insert({
    wishlist_id: listId,
    title,
    description,
    price,
    url,
    priority,
    sort_order,
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
