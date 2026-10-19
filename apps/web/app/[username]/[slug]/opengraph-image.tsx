import { ImageResponse } from 'next/og'
import { createServerSupabase } from '@/lib/supabase/server'
import { decodeParam } from '@/lib/params'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = { params: Promise<{ username: string; slug: string }> }

// Satori can't read WOFF2, so ask Google Fonts for WOFF by sending an old browser UA.
const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Archivo+Black'
const OLD_BROWSER_UA = 'Mozilla/5.0 (Windows NT 6.1; rv:9.0) Gecko/20100101 Firefox/9.0'

let archivoBlackPromise: Promise<ArrayBuffer | null> | undefined

function loadArchivoBlack() {
  archivoBlackPromise ??= (async () => {
    try {
      const css = await (await fetch(FONT_CSS_URL, { headers: { 'User-Agent': OLD_BROWSER_UA } })).text()
      const fontUrl = css.match(/src: url\((.+?)\)/)?.[1]
      if (!fontUrl) return null
      return await (await fetch(fontUrl)).arrayBuffer()
    } catch {
      return null
    }
  })()
  return archivoBlackPromise
}

function titleSize(title: string) {
  if (title.length <= 16) return 130
  if (title.length <= 32) return 104
  return 84
}

export default async function OGImage({ params }: Props) {
  const { username: rawUsername, slug } = await params
  const username = decodeParam(rawUsername)
  const supabase = await createServerSupabase()

  const { data: list } = await supabase
    .from('wishlists')
    .select('id, title, recipient_name, profiles!inner(username, display_name)')
    .eq('slug', slug)
    .eq('profiles.username', username)
    .in('privacy_level', ['public', 'link_only'])
    .single()

  const { count } = list
    ? await supabase.from('items').select('id', { count: 'exact', head: true }).eq('wishlist_id', list.id)
    : { count: 0 }

  const font = await loadArchivoBlack()

  const title = (list?.title ?? 'Lista de regalos').toUpperCase()
  const recipient = list?.recipient_name ?? ''
  const owner = (list?.profiles as { display_name?: string } | null)?.display_name ?? ''
  const ownerLine = recipient && owner
    ? `para ${recipient} · de ${owner}`
    : owner ? `de ${owner}` : recipient ? `para ${recipient}` : ''
  const itemCount = count ?? 0

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          background: '#F2F0E6',
          padding: '56px 72px',
          fontFamily: font ? 'Archivo Black' : 'Impact, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 30, color: '#E63322', fontFamily: 'monospace', letterSpacing: 4 }}>
            REGALA.ME
          </div>
          {itemCount > 0 && (
            <div style={{
              display: 'flex', background: '#0F0F0F', color: '#FBF8EE',
              padding: '10px 22px', fontSize: 24, letterSpacing: 1,
            }}>
              {`${itemCount} ${itemCount === 1 ? 'REGALO' : 'REGALOS'}`}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex', fontSize: titleSize(title), lineHeight: 0.88, letterSpacing: -3,
            color: '#0F0F0F',
          }}>
            {title}
          </div>
          {ownerLine && (
            <div style={{
              display: 'flex', marginTop: 28, fontSize: 30, color: 'rgba(15,15,15,0.6)',
              fontFamily: 'monospace', letterSpacing: 2,
            }}>
              {ownerLine.toUpperCase()}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{
            display: 'flex', background: '#F5E13E', border: '3px solid #0F0F0F',
            padding: '14px 26px', fontSize: 26, letterSpacing: 1,
          }}>
            ELEGÍ TU REGALO →
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: 'Archivo Black', data: font, weight: 400, style: 'normal' }] : undefined,
    }
  )
}
