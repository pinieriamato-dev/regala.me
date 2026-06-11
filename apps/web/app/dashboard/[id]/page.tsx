import { createServerSupabase } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { occasionEmoji } from 'shared'
import type { Item, OccasionId } from 'shared'
import Link from 'next/link'
import { deleteWishlist, addItem } from '@/app/dashboard/actions'
import AddItemForm from './add-item-form'
import DeleteWishlistButton from './delete-wishlist-button'
import ItemCard from './item-card'

type Props = { params: Promise<{ id: string }> }

export default async function ListDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: list } = await supabase
    .from('wishlists')
    .select('id, title, slug, occasion, occasion_date, is_surprise, currency, privacy_level, profiles!inner(username)')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!list) notFound()

  const { data: items } = await supabase
    .from('items')
    .select('*')
    .eq('wishlist_id', id)
    .order('sort_order')

  const { data: claims } = await supabase
    .from('claims')
    .select('item_id, claimer_name')
    .in('item_id', (items ?? []).map((i: Item) => i.id))

  const claimMap = new Map(
    (claims ?? []).map(c => [c.item_id, c.claimer_name])
  )

  const emoji = occasionEmoji(list.occasion as OccasionId)
  const profileData = list.profiles as unknown as { username: string } | null
  const username = profileData?.username ?? ''
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://regala.me'}/${username}/${list.slug}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`¡Hola! Esta es mi lista de regalos para ${list.title}:\n${shareUrl}`)}`

  const deleteWithId = deleteWishlist.bind(null, id)

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/dashboard" className="rg-mono" style={{ color: 'rgba(15,15,15,0.5)', textDecoration: 'none', fontSize: 10 }}>
          ← MIS LISTAS
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 40 }}>{emoji}</span>
          <div>
            <h1 className="rg-display" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>{list.title}</h1>
            {list.occasion_date && (
              <div className="rg-mono" style={{ fontSize: 9, color: 'rgba(15,15,15,0.45)', marginTop: 4 }}>
                {new Date(list.occasion_date).toLocaleDateString('es-AR',
                  list.occasion === 'birthday'
                    ? { day: 'numeric', month: 'long' }
                    : { day: 'numeric', month: 'long', year: 'numeric' }
                )}
              </div>
            )}
          </div>
        </div>
        <DeleteWishlistButton action={deleteWithId} />
      </div>

      {/* Share card */}
      <div className="rg-card-ink" style={{ padding: '20px 22px', marginBottom: 24 }}>
        {list.privacy_level === 'private' ? (
          <>
            <div className="rg-mono" style={{ fontSize: 9, color: 'rgba(251,248,238,0.5)', marginBottom: 6 }}>🔒 LISTA PRIVADA</div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, wordBreak: 'break-all', marginBottom: 16, opacity: 0.8 }}>{shareUrl}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(251,248,238,0.45)', margin: 0 }}>
              SOLO VOS PODÉS VER ESTA LISTA. CAMBIÁ LA PRIVACIDAD PARA COMPARTIRLA.
            </p>
          </>
        ) : (
          <>
            <div className="rg-mono" style={{ fontSize: 9, color: 'rgba(251,248,238,0.5)', marginBottom: 6 }}>
              {list.privacy_level === 'link_only' ? '🔗 LINK PRIVADO — SOLO QUIEN TENGA EL LINK PUEDE VERLA' : 'LINK PÚBLICO DE TU LISTA'}
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, wordBreak: 'break-all', marginBottom: 16, opacity: 0.8 }}>{shareUrl}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rg-btn"
                style={{
                  flex: 1, padding: '10px', fontSize: 11, justifyContent: 'center',
                  background: '#25D366', color: 'var(--ink)', border: '2px solid var(--ink)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                COMPARTIR POR WHATSAPP
              </a>
              <a
                href={`/${username}/${list.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rg-btn rg-btn-ghost"
                style={{ padding: '10px 16px', fontSize: 11 }}
              >
                VER VISTA
              </a>
            </div>
          </>
        )}
      </div>

      {/* Items */}
      <div style={{ marginBottom: 16 }}>
        <div className="rg-mono" style={{ fontSize: 10, marginBottom: 14 }}>
          ÍTEMS ({(items ?? []).length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(items ?? []).map((item: Item) => (
            <ItemCard
              key={item.id}
              item={item}
              claimer={claimMap.get(item.id) ?? null}
              listId={id}
              currency={list.currency}
              isSurprise={list.is_surprise ?? false}
            />
          ))}
        </div>
      </div>

      {/* Add item form */}
      <AddItemForm listId={id} currency={list.currency} />
    </div>
  )
}
