'use server'

import { createServerSupabase } from '@/lib/supabase/server'
import { trackEvent } from '@/lib/analytics'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Browser clicks that the server cannot see on its own. Only these two events are
// accepted, so the action can't be used to write arbitrary analytics.
export async function trackLinkClick(event: 'list_shared' | 'signup_from_gifter_footer', listId: string) {
  if (!UUID.test(listId)) return

  if (event === 'list_shared') {
    // Only the owner can share, so confirm the list is theirs (RLS returns nothing otherwise).
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: list } = await supabase.from('wishlists').select('id').eq('id', listId).maybeSingle()
    if (!list) return
    trackEvent('list_shared', user.id, { wishlist_id: listId, channel: 'whatsapp' })
    return
  }

  // Gifters are anonymous, so group by list like the other gifter events.
  trackEvent('signup_from_gifter_footer', `list:${listId}`, { wishlist_id: listId })
}
