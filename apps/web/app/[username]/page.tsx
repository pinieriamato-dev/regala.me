import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { occasionEmoji } from 'shared'
import type { OccasionId } from 'shared'
import Link from 'next/link'
import type { Metadata } from 'next'
import Logomark from '@/components/Logomark'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return {
    title: `Listas de ${username} — regala.me`,
    description: `Mirá las listas de regalos de ${username} en regala.me.`,
  }
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createServerSupabase()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, birthday, avatar_url')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const { data: lists } = await supabase
    .from('wishlists')
    .select('id, title, slug, occasion, occasion_date, created_at')
    .eq('owner_id', profile.id)
    .eq('privacy_level', 'public')
    .order('created_at', { ascending: false })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ height: 4, background: 'var(--ink)' }} />
      <div style={{ padding: '14px 20px', borderBottom: '2px solid var(--ink)', background: 'var(--paper)' }}>
        <Logomark />
      </div>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px' }}>
        {/* Avatar + identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
          <div style={{
            width: 80, height: 80, flexShrink: 0,
            border: '2px solid var(--ink)', boxShadow: 'var(--shadow-sm)',
            background: 'var(--yellow)', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {profile.avatar_url && /^https?:\/\//i.test(profile.avatar_url)
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span className="rg-display" style={{ fontSize: 28 }}>
                  {(profile.display_name ?? username).slice(0, 2).toUpperCase()}
                </span>
            }
          </div>
          <div>
            <h1 className="rg-display" style={{ fontSize: 'clamp(1.8rem, 6vw, 3rem)', lineHeight: 1 }}>
              {(profile.display_name ?? username).toUpperCase()}
            </h1>
            <div className="rg-mono" style={{ fontSize: 10, marginTop: 4, color: 'rgba(15,15,15,0.5)' }}>
              @{username}
            </div>
          </div>
        </div>

        {/* Bio + birthday */}
        {(profile.bio || profile.birthday) && (
          <div style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {profile.bio && (
              <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.7)', margin: 0, lineHeight: 1.5 }}>
                {profile.bio}
              </p>
            )}
            {profile.birthday && (
              <div className="rg-mono" style={{ fontSize: 10, color: 'rgba(15,15,15,0.5)' }}>
                🎂 {new Date(profile.birthday).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
              </div>
            )}
          </div>
        )}
        {!profile.bio && !profile.birthday && <div style={{ marginBottom: 28 }} />}

        {(lists ?? []).length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', border: '2px dashed var(--ink)' }}>
            <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.55)' }}>No hay listas públicas todavía.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(lists ?? []).map((list) => (
              <Link
                key={list.id}
                href={`/${username}/${list.slug}`}
                className="rg-card"
                style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none', color: 'var(--ink)' }}
              >
                <span style={{ fontSize: 32 }}>{occasionEmoji(list.occasion as OccasionId)}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{list.title}</div>
                  {list.occasion_date && (
                    <div className="rg-mono" style={{ fontSize: 9, marginTop: 3, color: 'rgba(15,15,15,0.5)' }}>
                      {new Date(list.occasion_date).toLocaleDateString('es-AR',
                        list.occasion === 'birthday'
                          ? { day: 'numeric', month: 'long' }
                          : { day: 'numeric', month: 'long', year: 'numeric' }
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        <div style={{ marginTop: 40, padding: '20px 22px', textAlign: 'center', background: 'var(--ink)', color: 'var(--paper)' }}>
          <div className="rg-display" style={{ fontSize: 24, marginBottom: 10 }}>
            ¿QUERÉS TU PROPIA LISTA?
          </div>
          <Link href="/" className="rg-btn rg-btn-yellow" style={{ padding: '12px 22px', fontSize: 13 }}>
            CREAR LISTA →
          </Link>
        </div>
      </div>
    </div>
  )
}
