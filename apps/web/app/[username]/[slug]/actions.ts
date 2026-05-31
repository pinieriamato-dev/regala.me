'use server'

import { createServerSupabase } from '@/lib/supabase/server'

type ClaimState = { error?: string; success?: boolean } | null

export async function claimItem(_prevState: ClaimState, formData: FormData): Promise<ClaimState> {
  const supabase = await createServerSupabase()
  const { error } = await supabase.from('claims').insert({
    item_id: formData.get('item_id') as string,
    claimer_name: (formData.get('name') as string).trim(),
  })
  if (error) return { error: error.message }
  return { success: true }
}
