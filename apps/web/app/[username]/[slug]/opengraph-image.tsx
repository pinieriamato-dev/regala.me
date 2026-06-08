import { ImageResponse } from 'next/og'
import { createServerSupabase } from '@/lib/supabase/server'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = { params: Promise<{ username: string; slug: string }> }

export default async function OGImage({ params }: Props) {
  const { username, slug } = await params
  const supabase = await createServerSupabase()

  const { data: list } = await supabase
    .from('wishlists')
    .select('title, recipient_name, occasion, profiles!inner(username, display_name)')
    .eq('slug', slug)
    .eq('profiles.username', username)
    .in('privacy_level', ['public', 'link_only'])
    .single()

  const title = list?.title ?? 'Lista de regalos'
  const name = list?.recipient_name ?? (list?.profiles as { display_name?: string } | null)?.display_name ?? ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start',
          background: '#F2F0E6',
          padding: '60px 80px',
          fontFamily: 'Impact, sans-serif',
        }}
      >
        <div style={{ display: 'flex', marginBottom: 24, fontSize: 28, color: '#E63322', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 4 }}>
          regala.me
        </div>
        <div style={{
          fontSize: 80, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: -2, lineHeight: 0.88, color: '#0F0F0F',
          marginBottom: 24, maxWidth: 900,
        }}>
          {title}
        </div>
        {name && (
          <div style={{ fontSize: 32, color: 'rgba(15,15,15,0.55)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2 }}>
            de {name}
          </div>
        )}
        <div style={{
          position: 'absolute', bottom: 60, right: 80,
          background: '#F5E13E', border: '3px solid #0F0F0F',
          padding: '12px 24px', fontSize: 22, fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: 1,
        }}>
          ELEGÍ TU REGALO →
        </div>
      </div>
    ),
    { ...size }
  )
}
