'use server'

import { createServerSupabase } from '@/lib/supabase/server'
import { z } from 'zod'

type ClaimState = { error?: string; success?: boolean } | null

const claimSchema = z.object({
  item_id: z.string().uuid(),
  name: z.string().min(1).max(100),
})

export async function claimItem(_prevState: ClaimState, formData: FormData): Promise<ClaimState> {
  const parsed = claimSchema.safeParse({
    item_id: formData.get('item_id'),
    name: (formData.get('name') as string | null)?.trim() ?? '',
  })
  if (!parsed.success) return { error: 'Datos inválidos.' }

  const supabase = await createServerSupabase()

  const { data: item } = await supabase
    .from('items')
    .select('id, wishlist_id, wishlists!inner(privacy_level)')
    .eq('id', parsed.data.item_id)
    .in('wishlists.privacy_level', ['public', 'link_only'])
    .single()

  if (!item) return { error: 'No se pudo reclamar el regalo. Intentá de nuevo.' }

  const { error } = await supabase.from('claims').insert({
    item_id: parsed.data.item_id,
    claimer_name: parsed.data.name,
  })

  if (error) {
    if (error.code === '23505') return { error: '¡Ya alguien lo reclamó! Elegí otro regalo.' }
    return { error: 'No se pudo reclamar el regalo. Intentá de nuevo.' }
  }

  return { success: true }
}
