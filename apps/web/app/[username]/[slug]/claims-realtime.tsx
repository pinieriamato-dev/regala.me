'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// Realtime filters take an `in` list; past this many items we skip live updates rather than send a long filter.
const MAX_FILTERED_ITEMS = 100
const REFRESH_DEBOUNCE_MS = 400

type Props = {
  // False for the owner's own surprise list: they must never get live claim data.
  enabled: boolean
  itemIds: string[]
  supabaseUrl: string
  supabaseKey: string
}

// On any claim change, re-run the server page. The server still decides what each viewer sees,
// so this component never handles claim rows itself.
export default function ClaimsRealtime({ enabled, itemIds, supabaseUrl, supabaseKey }: Props) {
  const router = useRouter()
  const idsKey = itemIds.join(',')

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : []
    if (!enabled || ids.length === 0 || ids.length > MAX_FILTERED_ITEMS) return

    const supabase = createClient(supabaseUrl, supabaseKey, {
      // Anonymous, read-only use: no session is read or stored, so the viewer's login is never used here.
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })

    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS)
    }

    const channel = supabase
      .channel('gifter-claims')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'claims', filter: `item_id=in.(${idsKey})` },
        refresh,
      )
      // Deletes carry only the primary key, so they can't be filtered to this list: any release refreshes the page.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'claims' }, refresh)
      .subscribe()

    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [enabled, idsKey, supabaseUrl, supabaseKey, router])

  return null
}
