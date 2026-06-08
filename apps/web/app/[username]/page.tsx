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
    .select('username, display_name')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const { data: lists } = await supabase
    .from('wishlists')
    .select('id, title, slug, occasion, occasion_date, created_at')
    .eq('privacy_level', 'public')
    .order('created_at', { ascending: false })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ height: 4, background: 'var(--ink)' }} />
      <div style={{ padding: '14px 20px', borderBottom: '2px solid var(--ink)', background: 'var(--paper)' }}>
        <Logomark />
      </div>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px' }}>
        <h1 className="rg-display" style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', marginBottom: 8 }}>
          {(profile.display_name ?? username).toUpperCase()}
        </h1>
        <div className="rg-mono" style={{ fontSize: 10, marginBottom: 32, color: 'rgba(15,15,15,0.5)' }}>
          @{username}
        </div>

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
                      {new Date(list.occasion_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
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
