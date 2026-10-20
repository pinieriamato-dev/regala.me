'use server'

import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const profileIdSchema = z.string().uuid()
const friendshipIdSchema = z.string().uuid()

async function requireUser() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')
  return { supabase, user }
}

// Sends a friend request. Mutual: the other person accepts it from their own page.
// If they already sent us one, we accept it instead of creating a duplicate.
export async function sendFriendRequest(addresseeId: string) {
  const parsed = profileIdSchema.safeParse(addresseeId)
  if (!parsed.success) return
  const { supabase, user } = await requireUser()
  if (parsed.data === user.id) return

  const { data: existing } = await supabase
    .from('friendships')
    .select('id, requester_id, status')
    .or(`and(requester_id.eq.${user.id},addressee_id.eq.${parsed.data}),and(requester_id.eq.${parsed.data},addressee_id.eq.${user.id})`)
    .maybeSingle()

  if (existing) {
    // They asked us first: accepting it is what the user means by "agregar".
    if (existing.status === 'pending' && existing.requester_id === parsed.data) {
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', existing.id)
    }
  } else {
    await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: parsed.data })
  }

  revalidatePath('/dashboard/amigos')
}

export async function acceptFriendRequest(friendshipId: string) {
  const parsed = friendshipIdSchema.safeParse(friendshipId)
  if (!parsed.success) return
  const { supabase } = await requireUser()
  // RLS only lets the addressee update, so this is a no-op for anyone else.
  await supabase.from('friendships').update({ status: 'accepted' }).eq('id', parsed.data).eq('status', 'pending')
  revalidatePath('/dashboard/amigos')
}

// Used for declining a request, cancelling one we sent, and unfriending.
export async function removeFriendship(friendshipId: string) {
  const parsed = friendshipIdSchema.safeParse(friendshipId)
  if (!parsed.success) return
  const { supabase } = await requireUser()
  await supabase.from('friendships').delete().eq('id', parsed.data)
  revalidatePath('/dashboard/amigos')
}
