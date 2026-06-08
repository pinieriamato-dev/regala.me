import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import dns from 'node:dns/promises'

// Private/loopback/link-local ranges — checked after DNS resolution to defeat DNS-rebinding
// and redirect-based SSRF bypasses
const PRIVATE_IPV4 = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.|0\.0\.0\.0)/
const PRIVATE_IPV6 = /^(::1$|fc|fd|fe80:)/i

async function isPrivateHost(hostname: string): Promise<boolean> {
  try {
    const records = await dns.lookup(hostname, { all: true })
    return records.some(r => PRIVATE_IPV4.test(r.address) || PRIVATE_IPV6.test(r.address))
  } catch {
    return true // DNS failure → block
  }
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
}

async function readHtml(res: Response): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) return ''
  const decoder = new TextDecoder()
  let html = ''
  let bytes = 0
  while (bytes < 200_000) {
    const { done, value } = await reader.read()
    if (done) break
    html += decoder.decode(value, { stream: true })
    bytes += value.byteLength
  }
  reader.cancel()
  return html
}

function getOGTag(html: string, property: string): string | null {
  let match = html.match(
    new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, 'i')
  )
  if (match) return match[1].trim()
  match = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, 'i')
  )
  return match ? match[1].trim() : null
}

function getMetaName(html: string, name: string): string | null {
  let match = html.match(
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')
  )
  if (match) return match[1].trim()
  match = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i')
  )
  return match ? match[1].trim() : null
}

function extractPrice(html: string): number | null {
  const scriptMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const scriptMatch of scriptMatches) {
    try {
      const data = JSON.parse(scriptMatch[1])
      const entries = Array.isArray(data) ? data : [data]
      for (const entry of entries) {
        const offers = entry?.offers
        if (!offers) continue
        const offer = Array.isArray(offers) ? offers[0] : offers
        const price = offer?.price ?? offer?.lowPrice
        if (price !== undefined && price !== null) return Number(price)
      }
    } catch { /* continue */ }
  }

  const ogPrice = getOGTag(html, 'price:amount') ?? getMetaName(html, 'product:price:amount')
  if (ogPrice) return Number(ogPrice)

  const pricePattern = html.match(/"price"\s*:\s*(\d+(?:[.,]\d+)?)/i)
  if (pricePattern) {
    const n = parseFloat(pricePattern[1].replace(',', '.'))
    if (!isNaN(n) && n > 0) return n
  }

  return null
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const rawUrl = request.nextUrl.searchParams.get('url')
  if (!rawUrl) return Response.json({ error: 'URL requerida' }, { status: 400 })

  let targetUrl: URL
  try {
    targetUrl = new URL(rawUrl)
  } catch {
    return Response.json({ error: 'URL inválida' }, { status: 400 })
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    return Response.json({ error: 'URL inválida' }, { status: 400 })
  }

  // DNS-resolve before fetching — blocks SSRF even when attacker controls DNS
  if (await isPrivateHost(targetUrl.hostname)) {
    return Response.json({ error: 'URL inválida' }, { status: 400 })
  }

  try {
    // redirect: 'manual' — we re-validate any Location header before following,
    // preventing redirect-chain SSRF (e.g. public host → 302 → 169.254.169.254)
    const res = await fetch(targetUrl.toString(), {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(8000),
      redirect: 'manual',
    })

    // Handle one redirect level — re-validate destination hostname via DNS
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) return Response.json({ error: 'No se pudo acceder al producto' }, { status: 422 })

      let redirectUrl: URL
      try {
        redirectUrl = new URL(location, targetUrl)
      } catch {
        return Response.json({ error: 'URL inválida' }, { status: 400 })
      }

      if (!['http:', 'https:'].includes(redirectUrl.protocol) || await isPrivateHost(redirectUrl.hostname)) {
        return Response.json({ error: 'URL inválida' }, { status: 400 })
      }

      const res2 = await fetch(redirectUrl.toString(), {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(8000),
        redirect: 'error', // no further redirects after one hop
      })

      if (!res2.ok) return Response.json({ error: 'No se pudo acceder al producto' }, { status: 422 })
      const html = await readHtml(res2)
      return Response.json({
        title: getOGTag(html, 'title') ?? getMetaName(html, 'title'),
        description: getOGTag(html, 'description') ?? getMetaName(html, 'description'),
        image_url: getOGTag(html, 'image'),
        price: extractPrice(html),
        url: rawUrl,
      })
    }

    if (!res.ok) return Response.json({ error: 'No se pudo acceder al producto' }, { status: 422 })

    const html = await readHtml(res)
    return Response.json({
      title:       getOGTag(html, 'title') ?? getMetaName(html, 'title'),
      description: getOGTag(html, 'description') ?? getMetaName(html, 'description'),
      image_url:   getOGTag(html, 'image'),
      price:       extractPrice(html),
      url:         rawUrl,
    })
  } catch {
    return Response.json({ error: 'No se pudo extraer el producto' }, { status: 500 })
  }
}
