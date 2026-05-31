import { NextRequest } from 'next/server'

function getOGTag(html: string, property: string): string | null {
  // Try property="og:X" content="..."
  let match = html.match(
    new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, 'i')
  )
  if (match) return match[1].trim()

  // Try content="..." property="og:X"
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
  // JSON-LD product schema
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

  // OG price tags
  const ogPrice = getOGTag(html, 'price:amount') ?? getMetaName(html, 'product:price:amount')
  if (ogPrice) return Number(ogPrice)

  // Mercado Libre / common price patterns in HTML
  const pricePattern = html.match(/"price"\s*:\s*(\d+(?:[.,]\d+)?)/i)
  if (pricePattern) {
    const n = parseFloat(pricePattern[1].replace(',', '.'))
    if (!isNaN(n) && n > 0) return n
  }

  return null
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url')
  if (!rawUrl) {
    return Response.json({ error: 'URL requerida' }, { status: 400 })
  }

  let targetUrl: URL
  try {
    targetUrl = new URL(rawUrl)
  } catch {
    return Response.json({ error: 'URL inválida' }, { status: 400 })
  }

  // Only allow http/https
  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    return Response.json({ error: 'URL inválida' }, { status: 400 })
  }

  // Block private/loopback addresses (SSRF prevention)
  const SSRF_BLOCKLIST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.|\[::1\])/i
  if (SSRF_BLOCKLIST.test(targetUrl.hostname)) {
    return Response.json({ error: 'URL inválida' }, { status: 400 })
  }

  try {
    const res = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return Response.json({ error: 'No se pudo acceder al producto' }, { status: 422 })
    }

    // Limit to first 200 KB — enough for head/OG tags
    const reader = res.body?.getReader()
    let html = ''
    if (reader) {
      const decoder = new TextDecoder()
      let bytes = 0
      while (bytes < 200_000) {
        const { done, value } = await reader.read()
        if (done) break
        html += decoder.decode(value, { stream: true })
        bytes += value.byteLength
      }
      reader.cancel()
    }

    const title       = getOGTag(html, 'title') ?? getMetaName(html, 'title')
    const description = getOGTag(html, 'description') ?? getMetaName(html, 'description')
    const image_url   = getOGTag(html, 'image')
    const price       = extractPrice(html)

    return Response.json({ title, description, image_url, price, url: rawUrl })
  } catch {
    return Response.json({ error: 'No se pudo extraer el producto' }, { status: 500 })
  }
}
