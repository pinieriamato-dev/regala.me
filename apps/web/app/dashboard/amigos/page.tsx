import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { occasionEmoji } from 'shared'
import type { OccasionId } from 'shared'
import { sendFriendRequest, acceptFriendRequest, removeFriendship } from './actions'

type Person = { id: string; username: string; display_name: string | null; avatar_url: string | null }
type Friendship = { id: string; requester_id: string; addressee_id: string; status: 'pending' | 'accepted' }
type FriendList = {
  id: string
  title: string
  slug: string
  occasion: OccasionId | null
  owner_id: string
  owner: { username: string; display_name: string | null } | null
}

// Only letters, digits, spaces and . _ + - reach the search filter, so the PostgREST `or` string stays intact.
function cleanQuery(raw: string | undefined): string {
  return (raw ?? '').replace(/[^\p{L}\p{N} ._+-]/gu, '').trim().slice(0, 40)
}

function nameOf(p: { username: string; display_name: string | null }) {
  return p.display_name ?? p.username
}

export default async function AmigosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: rawQ } = await searchParams
  const q = cleanQuery(rawQ)

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: friendshipData } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
  const friendships = (friendshipData ?? []) as Friendship[]

  const otherId = (f: Friendship) => (f.requester_id === user.id ? f.addressee_id : f.requester_id)
  const accepted = friendships.filter(f => f.status === 'accepted')
  const incoming = friendships.filter(f => f.status === 'pending' && f.addressee_id === user.id)
  const outgoing = friendships.filter(f => f.status === 'pending' && f.requester_id === user.id)
  const friendIds = accepted.map(otherId)
  const knownIds = new Set(friendships.map(otherId))

  const peopleIds = [...new Set([...incoming, ...outgoing, ...accepted].map(otherId))]
  const { data: peopleData } = peopleIds.length
    ? await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', peopleIds)
    : { data: [] }
  const people = new Map(((peopleData ?? []) as Person[]).map(p => [p.id, p]))

  const { data: searchData } = q.length >= 2
    ? await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .neq('id', user.id)
        .limit(20)
    : { data: [] }
  const results = ((searchData ?? []) as Person[]).filter(p => !knownIds.has(p.id))

  // Friends' public lists. Link-only and private lists stay out, as they are on the profile page.
  const { data: feedData } = friendIds.length
    ? await supabase
        .from('wishlists')
        .select('id, title, slug, occasion, owner_id, owner:profiles!owner_id(username, display_name)')
        .in('owner_id', friendIds)
        .in('privacy_level', ['public', 'friends'])
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] }
  const feed = (feedData ?? []) as unknown as FriendList[]

  const btn = { padding: '8px 14px', fontSize: 11 } as const
  const section = { marginBottom: 40 } as const

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <div className="rg-mono" style={{ marginBottom: 4 }}>Amigos</div>
        <h1 className="rg-display" style={{ fontSize: 'clamp(3rem, 6vw, 5rem)' }}>
          TUS <span className="rg-em">AMIGOS.</span>
        </h1>
      </div>

      {/* Lists from friends */}
      <section style={section}>
        <div className="rg-mono" style={{ marginBottom: 12 }}>Listas de tus amigos</div>
        {friendIds.length === 0 ? (
          <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.65)' }}>
            Cuando tengas amigos, acá vas a ver sus listas públicas sin que te tengan que mandar el link.
          </p>
        ) : feed.length === 0 ? (
          <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.65)' }}>Tus amigos todavía no tienen listas públicas.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {feed.map(list => {
              const username = list.owner?.username
              if (!username) return null
              return (
                <Link
                  key={list.id}
                  href={`/${username}/${list.slug}`}
                  className="rg-card"
                  style={{ padding: 18, textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="rg-mono" style={{ fontSize: 9, marginBottom: 8, color: 'var(--ink-muted)' }}>
                    {occasionEmoji(list.occasion ?? 'other')} DE {nameOf({ username, display_name: list.owner?.display_name ?? null }).toUpperCase()}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>{list.title}</div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Requests waiting for us */}
      {incoming.length > 0 && (
        <section style={section}>
          <div className="rg-mono" style={{ marginBottom: 12 }}>Solicitudes para vos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {incoming.map(f => {
              const p = people.get(otherId(f))
              if (!p) return null
              return (
                <div key={f.id} className="rg-card" style={{ padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700 }}>{nameOf(p)} <span className="rg-mono" style={{ fontSize: 10, color: 'var(--ink-muted)' }}>@{p.username}</span></div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <form action={acceptFriendRequest.bind(null, f.id)}>
                      <button type="submit" className="rg-btn rg-btn-primary" style={btn}>ACEPTAR</button>
                    </form>
                    <form action={removeFriendship.bind(null, f.id)}>
                      <button type="submit" className="rg-btn rg-btn-ghost" style={btn}>RECHAZAR</button>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Search */}
      <section style={section}>
        <div className="rg-mono" style={{ marginBottom: 12 }}>Buscar gente</div>
        <form method="get" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            name="q"
            defaultValue={q}
            placeholder="Nombre o usuario"
            className="rg-input"
            style={{ flex: '1 1 240px', padding: '10px 12px' }}
          />
          <button type="submit" className="rg-btn rg-btn-primary" style={btn}>BUSCAR</button>
        </form>
        {q.length >= 2 && results.length === 0 && (
          <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.65)' }}>No encontramos a nadie con ese nombre.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {results.map(p => {
            const pending = outgoing.some(f => otherId(f) === p.id)
            return (
              <div key={p.id} className="rg-card" style={{ padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700 }}>{nameOf(p)} <span className="rg-mono" style={{ fontSize: 10, color: 'var(--ink-muted)' }}>@{p.username}</span></div>
                {pending ? (
                  <span className="rg-mono" style={{ fontSize: 10 }}>SOLICITUD ENVIADA</span>
                ) : (
                  <form action={sendFriendRequest.bind(null, p.id)}>
                    <button type="submit" className="rg-btn rg-btn-yellow" style={btn}>AGREGAR</button>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Friends */}
      <section style={section}>
        <div className="rg-mono" style={{ marginBottom: 12 }}>Tus amigos ({accepted.length})</div>
        {accepted.length === 0 ? (
          <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.65)' }}>Todavía no agregaste a nadie.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {accepted.map(f => {
              const p = people.get(otherId(f))
              if (!p) return null
              return (
                <div key={f.id} className="rg-card" style={{ padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <Link href={`/${p.username}`} style={{ fontWeight: 700, color: 'inherit', textDecoration: 'none' }}>
                    {nameOf(p)} <span className="rg-mono" style={{ fontSize: 10, color: 'var(--ink-muted)' }}>@{p.username}</span>
                  </Link>
                  <form action={removeFriendship.bind(null, f.id)}>
                    <button type="submit" className="rg-btn rg-btn-ghost" style={btn}>QUITAR</button>
                  </form>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {outgoing.length > 0 && (
        <section style={section}>
          <div className="rg-mono" style={{ marginBottom: 12 }}>Solicitudes enviadas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {outgoing.map(f => {
              const p = people.get(otherId(f))
              if (!p) return null
              return (
                <div key={f.id} className="rg-card" style={{ padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700 }}>{nameOf(p)} <span className="rg-mono" style={{ fontSize: 10, color: 'var(--ink-muted)' }}>@{p.username}</span></div>
                  <form action={removeFriendship.bind(null, f.id)}>
                    <button type="submit" className="rg-btn rg-btn-ghost" style={btn}>CANCELAR</button>
                  </form>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
