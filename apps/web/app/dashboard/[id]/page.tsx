import { createServerSupabase } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { occasionEmoji } from 'shared'
import type { Item, OccasionId } from 'shared'
import Link from 'next/link'
import { deleteWishlist, addItem, deleteItem } from '@/app/dashboard/actions'
import AddItemForm from './add-item-form'

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
  const username = (list.profiles as unknown as { username: string }).username
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
                {new Date(list.occasion_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>
        <form action={deleteWithId}>
          <button
            type="submit"
            className="rg-btn rg-btn-ghost"
            style={{ padding: '8px 14px', fontSize: 11 }}
            onClick={(e) => { if (!confirm('¿Eliminar esta lista?')) e.preventDefault() }}
          >
            ELIMINAR
          </button>
        </form>
      </div>

      {/* Share card */}
      <div className="rg-card-ink" style={{ padding: '20px 22px', marginBottom: 24 }}>
        <div className="rg-mono" style={{ fontSize: 9, color: 'rgba(251,248,238,0.5)', marginBottom: 6 }}>LINK PÚBLICO DE TU LISTA</div>
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
      </div>

      {/* Items */}
      <div style={{ marginBottom: 16 }}>
        <div className="rg-mono" style={{ fontSize: 10, marginBottom: 14 }}>
          ÍTEMS ({(items ?? []).length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(items ?? []).map((item: Item) => {
            const claimer = claimMap.get(item.id)
            const deleteItemWithIds = deleteItem.bind(null, item.id, id)
            return (
              <div
                key={item.id}
                className="rg-card"
                style={{
                  padding: '14px 16px',
                  opacity: claimer ? 0.7 : 1,
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <p style={{
                      fontWeight: 800, fontSize: 14, margin: 0,
                      textDecoration: claimer ? 'line-through' : 'none',
                      color: claimer ? 'rgba(15,15,15,0.5)' : 'var(--ink)',
                    }}>
                      {item.title}
                    </p>
                    {claimer && (
                      list.is_surprise
                        ? <span className="rg-sticker rg-sticker-green" style={{ fontSize: 8 }}>RECLAMADO</span>
                        : <span className="rg-sticker rg-sticker-green" style={{ fontSize: 8 }}>✓ {claimer}</span>
                    )}
                    {!claimer && item.priority === 3 && (
                      <span className="rg-sticker rg-sticker-red" style={{ fontSize: 8 }}>ESENCIAL</span>
                    )}
                    {!claimer && item.priority === 2 && (
                      <span className="rg-sticker" style={{ fontSize: 8 }}>ME GUSTA</span>
                    )}
                  </div>
                  {item.description && (
                    <p style={{ fontSize: 12, color: 'rgba(15,15,15,0.6)', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                      {item.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                    {item.price && (
                      <span className="rg-mono" style={{ fontSize: 10 }}>
                        ~{list.currency} {item.price.toLocaleString('es-AR')}
                      </span>
                    )}
                    {/^https?:\/\//i.test(item.url ?? '') && (
                      <a href={item.url!} target="_blank" rel="noopener noreferrer"
                        className="rg-mono" style={{ fontSize: 10, color: 'var(--red)', textDecoration: 'none' }}>
                        VER PRODUCTO →
                      </a>
                    )}
                  </div>
                </div>
                {!claimer && (
                  <form action={deleteItemWithIds}>
                    <button
                      type="submit"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontFamily: 'var(--font-display)', fontSize: 18,
                        color: 'rgba(15,15,15,0.3)', lineHeight: 1, padding: '4px 6px',
                      }}
                    >
                      ×
                    </button>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Add item form */}
      <AddItemForm listId={id} currency={list.currency} />
    </div>
  )
}
