import { notFound } from 'next/navigation'
import { cache } from 'react'
import { createServerSupabase } from '@/lib/supabase/server'
import { occasionEmoji } from 'shared'
import type { Item, Claim, OccasionId } from 'shared'
import GifterItems from './gifter-items'
import ClaimsRealtime from './claims-realtime'
import Logomark from '@/components/Logomark'
import { decodeParam } from '@/lib/params'
import { trackEvent } from '@/lib/analytics'
import TrackedLink from '@/components/TrackedLink'

export const revalidate = 0

type Props = { params: Promise<{ username: string; slug: string }> }

const getListData = cache(async (username: string, slug: string) => {
  const supabase = await createServerSupabase()

  const { data: list } = await supabase
    .from('wishlists')
    .select('*, profiles!inner(username, display_name)')
    .eq('slug', slug)
    .eq('profiles.username', username)
    .in('privacy_level', ['public', 'link_only'])
    .single()

  if (!list) return null

  const { data: items } = await supabase
    .from('items').select('*').eq('wishlist_id', list.id)
    .order('priority', { ascending: false })
    .order('sort_order')

  const itemList = items ?? []
  const itemIds = itemList.map((i: Item) => i.id)

  const { data: claims } = itemIds.length
    ? await supabase.from('claims').select('item_id, is_group_gift, contribution_amount').in('item_id', itemIds)
    : { data: [] }

  // Shared-gift pledges are not a claim: only a whole-item claim marks the gift as taken.
  const claimedIds = (claims ?? [])
    .filter((c: Pick<Claim, 'item_id' | 'is_group_gift'>) => !c.is_group_gift)
    .map((c: Pick<Claim, 'item_id'>) => c.item_id)
  const claimedSet = new Set(claimedIds)
  const available = itemList.filter((i: Item) => !claimedSet.has(i.id)).length

  // Amount pledged per item toward a shared gift. Surprise lists never show it.
  const raised: Record<string, number> = {}
  if (!list.is_surprise) {
    for (const c of (claims ?? []) as Pick<Claim, 'item_id' | 'is_group_gift' | 'contribution_amount'>[]) {
      if (c.is_group_gift) raised[c.item_id] = (raised[c.item_id] ?? 0) + Number(c.contribution_amount ?? 0)
    }
  }

  return { list, items: itemList, claimedIds, available, raised }
})

export async function generateMetadata({ params }: Props) {
  const { username: rawUsername, slug } = await params
  const username = decodeParam(rawUsername)
  const data = await getListData(username, slug)
  if (!data) return { title: 'regala.me' }

  const { list, items, available } = data
  // Surprise lists: the WhatsApp preview is also seen by the owner, so don't reveal how many were claimed.
  const description = list.is_surprise
    ? `${items.length} regalos para ${list.title}. Elegí el tuyo en regala.me.`
    : `${available} regalos disponibles para ${list.title}. Elegí el tuyo en regala.me.`

  return {
    title: `${list.title} — regala.me`,
    description,
    // link_only lists are reachable by URL but must not show up in search engines.
    robots: list.privacy_level === 'link_only' ? { index: false, follow: false } : undefined,
    openGraph: {
      title: `${list.title} — regala.me`,
      description,
      siteName: 'regala.me',
    },
  }
}

export default async function GifterPage({ params }: Props) {
  const { username: rawUsername, slug } = await params
  const username = decodeParam(rawUsername)

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  const data = await getListData(username, slug)
  if (!data) notFound()

  trackEvent('list_viewed', `list:${data.list.id}`, {
    privacy_level: data.list.privacy_level,
    is_surprise: data.list.is_surprise,
    item_count: data.items.length,
  })

  const { list, items, claimedIds, raised } = data
  const isOwnerSurpriseView = !!(list.is_surprise && user?.id === list.owner_id)

  const emoji = occasionEmoji(list.occasion as OccasionId)
  const currency: string = list.currency ?? 'ARS'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Top border */}
      <div style={{ height: 4, background: 'var(--ink)' }} />

      {/* Nav */}
      <div style={{
        padding: '14px 20px', borderBottom: '2px solid var(--ink)',
        background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Logomark />
        <span className="rg-mono" style={{ fontSize: 10, color: 'rgba(15,15,15,0.45)' }}>
          {isOwnerSurpriseView ? 'MODO SORPRESA' : list.privacy_level === 'link_only' ? 'LINK PRIVADO' : 'LISTA PÚBLICA'}
        </span>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px' }}>
        {list.is_premium && list.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={list.cover_url} alt="" style={{ display: 'block', width: '100%', maxHeight: 280, objectFit: 'cover', border: '2px solid var(--ink)', boxShadow: 'var(--shadow)', marginBottom: 24 }} />
        )}

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 48 }}>{emoji}</span>
            <div>
              <h1 className="rg-display" style={{ fontSize: 'clamp(2rem, 7vw, 3.5rem)' }}>
                {list.title}
              </h1>
              {list.occasion_date && (
                <div className="rg-mono" style={{ marginTop: 4, fontSize: 10, color: 'rgba(15,15,15,0.5)' }}>
                  {new Date(list.occasion_date).toLocaleDateString('es-AR',
                    list.occasion === 'birthday'
                      ? { day: 'numeric', month: 'long' }
                      : { day: 'numeric', month: 'long', year: 'numeric' }
                  )}
                </div>
              )}
            </div>
          </div>

          {list.is_premium && (
            <a
              href={`/${encodeURIComponent(username)}/${slug}/invitacion`}
              className="rg-btn rg-btn-ghost"
              style={{ padding: '10px 16px', fontSize: 11, marginBottom: 14 }}
            >
              VER INVITACIÓN →
            </a>
          )}

          {isOwnerSurpriseView && (
            <div className="rg-card-yellow" style={{ padding: '10px 14px', marginBottom: 14 }}>
              <span className="rg-mono" style={{ fontSize: 9 }}>
                🎁 ESTÁS VIENDO TU PROPIA LISTA EN MODO SORPRESA — NO TE MOSTRAMOS QUÉ RECLAMARON
              </span>
            </div>
          )}

        </div>

        {/* Live claimed state. Off for the owner's surprise view, same as the claim data above. */}
        <ClaimsRealtime
          enabled={!isOwnerSurpriseView}
          itemIds={items.map(i => i.id)}
          supabaseUrl={process.env.SUPABASE_URL!}
          supabaseKey={process.env.SUPABASE_PUBLISHABLE_KEY!}
        />

        {/* Items. The owner's surprise view gets no claim data at all, not just hidden UI. */}
        <GifterItems
          items={items}
          claimedIds={isOwnerSurpriseView ? [] : claimedIds}
          currency={currency}
          ownerSurpriseView={isOwnerSurpriseView}
          raised={raised}
          sharesOpen={!list.is_surprise}
        />

        {/* Viral footer */}
        <div style={{
          marginTop: 40, padding: '20px 22px', textAlign: 'center',
          background: 'var(--ink)', color: 'var(--paper)',
          border: '2px solid var(--ink)', boxShadow: 'var(--shadow)',
        }}>
          <div className="rg-display" style={{ fontSize: 28, lineHeight: 0.92, marginBottom: 10 }}>
            ¿QUERÉS HACER<br />
            <span style={{ color: 'var(--yellow)' }}>TU PROPIA LISTA?</span>
          </div>
          <TrackedLink
            href="/"
            listId={data.list.id}
            event="signup_from_gifter_footer"
            className="rg-btn rg-btn-yellow"
            style={{ padding: '12px 22px', fontSize: 13 }}
          >
            CREAR LISTA GRATIS →
          </TrackedLink>
        </div>
      </div>
    </div>
  )
}
