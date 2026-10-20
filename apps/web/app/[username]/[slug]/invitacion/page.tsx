import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { createServerSupabase } from '@/lib/supabase/server'
import { decodeParam } from '@/lib/params'
import { occasionEmoji } from 'shared'
import type { OccasionId } from 'shared'
import Logomark from '@/components/Logomark'

export const revalidate = 0

// The invitation repeats the list's content, so keep it out of search results.
export const metadata = { robots: { index: false, follow: true } }

type Props = { params: Promise<{ username: string; slug: string }> }

export default async function InvitationPage({ params }: Props) {
  const { username: rawUsername, slug } = await params
  const username = decodeParam(rawUsername)

  const supabase = await createServerSupabase()
  const { data: list } = await supabase
    .from('wishlists')
    .select('id, title, occasion, occasion_date, recipient_name, cover_url, profiles!inner(username)')
    .eq('slug', slug)
    .eq('profiles.username', username)
    .eq('is_premium', true)
    .in('privacy_level', ['public', 'link_only'])
    .single()

  if (!list) notFound()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://regala.me'
  const listUrl = `${siteUrl}/${encodeURIComponent(username)}/${slug}`
  const qr = await QRCode.toDataURL(listUrl, {
    width: 240,
    margin: 1,
    color: { dark: '#0F0F0F', light: '#FBF8EE' },
  })

  const emoji = occasionEmoji(list.occasion as OccasionId)
  const dateLabel = list.occasion_date
    ? new Date(list.occasion_date).toLocaleDateString('es-AR',
        list.occasion === 'birthday'
          ? { day: 'numeric', month: 'long' }
          : { day: 'numeric', month: 'long', year: 'numeric' }
      )
    : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <div style={{ height: 4, background: 'var(--ink)' }} />
      <div style={{
        padding: '14px 20px', borderBottom: '2px solid var(--ink)',
        background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Logomark />
        <span className="rg-mono" style={{ fontSize: 10, color: 'rgba(15,15,15,0.45)' }}>INVITACIÓN</span>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="rg-card" style={{ overflow: 'hidden' }}>
          {list.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={list.cover_url} alt="" style={{ display: 'block', width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderBottom: '2px solid var(--ink)' }} />
          ) : (
            <div className="rg-img-ph" style={{ aspectRatio: '4 / 3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72, borderBottom: '2px solid var(--ink)' }}>
              {emoji}
            </div>
          )}
          <div style={{ padding: '22px 22px 26px', textAlign: 'center' }}>
            {list.recipient_name && (
              <div className="rg-mono" style={{ fontSize: 10, color: 'rgba(15,15,15,0.5)', marginBottom: 8 }}>
                PARA {list.recipient_name.toUpperCase()}
              </div>
            )}
            <h1 className="rg-display" style={{ fontSize: 'clamp(2rem, 8vw, 2.8rem)', margin: 0 }}>{list.title}</h1>
            {dateLabel && (
              <div className="rg-mono" style={{ marginTop: 12, fontSize: 11 }}>{dateLabel}</div>
            )}
          </div>
        </div>

        <div className="rg-card-ink" style={{ padding: '20px', textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Código QR para ver la lista de regalos" width={200} height={200} style={{ display: 'block', margin: '0 auto 14px', border: '2px solid var(--paper)' }} />
          <div className="rg-mono" style={{ fontSize: 10, color: 'rgba(251,248,238,0.6)', marginBottom: 14 }}>
            ESCANEÁ PARA VER LA LISTA DE REGALOS
          </div>
          <a href={listUrl} className="rg-btn rg-btn-yellow" style={{ padding: '12px 22px', fontSize: 12 }}>
            VER LA LISTA →
          </a>
        </div>
      </div>
    </div>
  )
}
