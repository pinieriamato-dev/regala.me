import { createServerSupabase } from '@/lib/supabase/server'
import { occasionEmoji } from 'shared'
import type { OccasionId } from 'shared'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: lists } = await supabase
    .from('wishlists')
    .select('id, title, slug, occasion, occasion_date, is_surprise, currency, privacy_level')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const { data: profile } = await supabase
    .from('profiles').select('username').eq('id', user.id).single()

  const listIds = (lists ?? []).map(l => l.id)
  const { data: items } = listIds.length
    ? await supabase.from('items').select('id, wishlist_id').in('wishlist_id', listIds)
    : { data: [] }

  const itemsByList = new Map<string, string[]>()
  for (const item of items ?? []) {
    const arr = itemsByList.get(item.wishlist_id) ?? []
    arr.push(item.id)
    itemsByList.set(item.wishlist_id, arr)
  }

  const allItemIds = (items ?? []).map((i: { id: string }) => i.id)
  const { data: claims } = allItemIds.length
    ? await supabase.from('claims').select('item_id').in('item_id', allItemIds)
    : { data: [] }

  const claimedSet = new Set((claims ?? []).map((c: { item_id: string }) => c.item_id))

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <div className="rg-mono" style={{ marginBottom: 4 }}>Mis listas</div>
          <h1 className="rg-display" style={{ fontSize: 'clamp(3rem, 6vw, 5rem)' }}>
            TUS <span className="rg-em">LISTAS.</span>
          </h1>
        </div>
        <Link href="/dashboard/new" className="rg-btn rg-btn-primary">
          + NUEVA LISTA
        </Link>
      </div>

      {/* URL extraction tip */}
      <div style={{
        marginBottom: 28, padding: '14px 18px',
        background: 'var(--yellow)', border: '2px solid var(--ink)', boxShadow: 'var(--shadow-sm)',
        display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, fontWeight: 700,
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 24 }}>🔗</span>
        <div>
          <div>PEGÁS EL LINK → NOSOTROS LLENAMOS TODO.</div>
          <div style={{ fontWeight: 400, fontSize: 12, marginTop: 2 }}>
            Mercado Libre, Amazon, Tiendanube — copiás el link del producto y extraemos nombre, precio e imagen automáticamente.
          </div>
        </div>
      </div>

      {(lists ?? []).length === 0 ? (
        <div style={{
          padding: '60px 32px', textAlign: 'center',
          border: '2px dashed var(--ink)', background: 'var(--paper)',
        }}>
          <div className="rg-display" style={{ fontSize: 80, lineHeight: 1, marginBottom: 14 }}>🎁</div>
          <h2 className="rg-display" style={{ fontSize: 36, marginBottom: 8 }}>
            TU PRIMERA <span className="rg-em">LISTA.</span>
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.65)', marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
            Agrega los regalos que querés y compartí el link con quien quieras.
          </p>
          <Link href="/dashboard/new" className="rg-btn rg-btn-primary">CREAR LISTA →</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {(lists ?? []).map((list) => {
            const listItems = itemsByList.get(list.id) ?? []
            const claimed   = listItems.filter(id => claimedSet.has(id)).length
            const total     = listItems.length
            const progress  = total > 0 ? Math.round((claimed / total) * 100) : 0
            const emoji     = list.occasion ? occasionEmoji(list.occasion as OccasionId) : '●'
            const shareUrl  = profile?.username
              ? `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://regala.me'}/${profile.username}/${list.slug}`
              : null

            return (
              <div key={list.id} className="rg-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 32 }}>{emoji}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>{list.title}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(15,15,15,0.5)', marginTop: 3 }}>
                        {list.occasion_date
                          ? new Date(list.occasion_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
                          : 'SIN FECHA'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {list.is_surprise && (
                      <span className="rg-sticker rg-sticker-ink" style={{ fontSize: 8 }}>SORPRESA</span>
                    )}
                    {list.privacy_level === 'link_only' && (
                      <span className="rg-sticker rg-sticker-paper" style={{ fontSize: 8 }}>🔗 LINK</span>
                    )}
                    {list.privacy_level === 'private' && (
                      <span className="rg-sticker rg-sticker-ink" style={{ fontSize: 8 }}>🔒 PRIVADA</span>
                    )}
                  </div>
                </div>

                {total > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 9, marginBottom: 5, color: 'rgba(15,15,15,0.5)' }}>
                      <span>{claimed} RECLAMADOS</span><span>{total} ÍTEMS</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(15,15,15,0.12)', border: '1px solid var(--ink)', borderRadius: 2 }}>
                      <div style={{ height: '100%', background: 'var(--green)', width: `${progress}%`, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <Link href={`/dashboard/${list.id}`} className="rg-btn rg-btn-ghost" style={{ flex: 1, padding: '10px', fontSize: 11, justifyContent: 'center' }}>
                    GESTIONAR
                  </Link>
                  {shareUrl && (
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`¡Hola! Esta es mi lista: ${shareUrl}`)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="rg-btn"
                      style={{ flex: 1, padding: '10px', fontSize: 11, justifyContent: 'center',
                               background: '#25D366', color: '#0F0F0F', border: '2px solid var(--ink)', boxShadow: 'var(--shadow-sm)' }}>
                      COMPARTIR
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
