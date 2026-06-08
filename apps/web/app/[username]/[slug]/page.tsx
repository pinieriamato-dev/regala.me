import { notFound } from 'next/navigation'
import { cache } from 'react'
import { createServerSupabase } from '@/lib/supabase/server'
import { occasionEmoji } from 'shared'
import type { Item, Claim, OccasionId } from 'shared'
import GifterItems from './gifter-items'
import Logomark from '@/components/Logomark'

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
    .from('items').select('*').eq('wishlist_id', list.id).order('sort_order')

  const itemList = items ?? []
  const itemIds = itemList.map((i: Item) => i.id)

  const { data: claims } = itemIds.length
    ? await supabase.from('claims').select('item_id').in('item_id', itemIds)
    : { data: [] }

  const claimedIds = (claims ?? []).map((c: Pick<Claim, 'item_id'>) => c.item_id)
  const claimedSet = new Set(claimedIds)
  const available = itemList.filter((i: Item) => !claimedSet.has(i.id)).length

  return { list, items: itemList, claimedIds, available }
})

export async function generateMetadata({ params }: Props) {
  const { username, slug } = await params
  const data = await getListData(username, slug)
  if (!data) return { title: 'regala.me' }

  const { list, available, claimedIds } = data
  const description = `${available} regalos disponibles para ${list.title}. Elegí el tuyo en regala.me.`

  return {
    title: `${list.title} — regala.me`,
    description,
    openGraph: {
      title: `${list.title} — regala.me`,
      description,
      siteName: 'regala.me',
    },
  }
}

export default async function GifterPage({ params }: Props) {
  const { username, slug } = await params

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  const data = await getListData(username, slug)
  if (!data) notFound()

  const { list, items, claimedIds, available } = data
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
          {isOwnerSurpriseView ? 'MODO SORPRESA' : 'LISTA PÚBLICA'}
        </span>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px' }}>
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
                  {new Date(list.occasion_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>

          {isOwnerSurpriseView && (
            <div className="rg-card-yellow" style={{ padding: '10px 14px', marginBottom: 14 }}>
              <span className="rg-mono" style={{ fontSize: 9 }}>
                🎁 ESTÁS VIENDO TU PROPIA LISTA EN MODO SORPRESA — LOS REGALOS RECLAMADOS ESTÁN OCULTOS
              </span>
            </div>
          )}

          {/* Stats bar */}
          <div style={{
            display: 'flex', gap: 20, padding: '10px 14px',
            background: 'var(--yellow)', border: '2px solid var(--ink)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div>
              <div className="rg-mono" style={{ fontSize: 9, marginBottom: 1 }}>DISPONIBLES</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: 1 }}>{available}</div>
            </div>
            <div style={{ width: 2, background: 'var(--ink)' }} />
            <div>
              <div className="rg-mono" style={{ fontSize: 9, marginBottom: 1 }}>RECLAMADOS</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: 1 }}>{claimedIds.length}</div>
            </div>
          </div>
        </div>

        {/* Items (client component handles surprise blur + claim) */}
        <GifterItems
          items={items}
          claimedIds={claimedIds}
          currency={currency}
          isOwnerSurpriseView={isOwnerSurpriseView}
          listIsSurprise={list.is_surprise ?? false}
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
          <a href="/" className="rg-btn rg-btn-yellow" style={{ padding: '12px 22px', fontSize: 13 }}>
            CREAR LISTA GRATIS →
          </a>
        </div>
      </div>
    </div>
  )
}
