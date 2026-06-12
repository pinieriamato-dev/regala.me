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

function getTagTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (!match) return null
  return match[1].trim()
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'")
}

function cleanTitle(title: string | null, siteName: string | null): string | null {
  if (!title) return null
  // Strip " | Site Name" or " - Site Name" suffixes from titles (common on Mercado Libre, Amazon, etc.)
  if (siteName) {
    const escaped = siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    title = title.replace(new RegExp(`\\s*[|\\-–]\\s*${escaped}\\s*$`, 'i'), '').trim()
  }
  // If the title is just the site name (bot-detection page), treat it as empty.
  // Use space-stripped comparison to catch "Mercado Libre" vs "mercadolibre" (hostname-derived).
  if (siteName && title.toLowerCase().replace(/\s+/g, '') === siteName.toLowerCase().replace(/\s+/g, '')) return null
  return title || null
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

// MercadoLibre APIs.
// Supports all ML country codes: MLA (AR), MLB (BR), MLM (MX), MLC (CL), MCO (CO), MLU (UY), etc.
const ML_HOSTNAME_RE  = /mercadolibre\.|mercadopago\.|mercadoshops\./i
const ML_ITEM_ID_RE   = /\b(ML[A-Z]-?\d+|MCO\d+)\b/i
const ML_CATALOG_PATH = /\/p\//i

type MLResult = { title: string | null; price: number | null; image_url: string | null }

// Module-level token cache — survives across requests on warm serverless instances.
let mlTokenCache: { token: string; expiresAt: number } | null = null

async function getMLToken(): Promise<string | null> {
  const now = Date.now()
  if (mlTokenCache && mlTokenCache.expiresAt > now + 60_000) return mlTokenCache.token
  const clientId     = process.env.ML_CLIENT_ID
  const clientSecret = process.env.ML_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  try {
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
      signal:  AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.access_token) return null
    mlTokenCache = { token: data.access_token, expiresAt: now + (data.expires_in ?? 21600) * 1000 }
    return mlTokenCache.token
  } catch {
    return null
  }
}

async function fetchMercadoLibreItem(itemId: string): Promise<MLResult | null> {
  const normalizedId = itemId.replace('-', '')
  try {
    const res = await fetch(`https://api.mercadolibre.com/items/${normalizedId}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.title) return null
    return {
      title:     data.title ?? null,
      price:     typeof data.price === 'number' ? data.price : null,
      image_url: data.pictures?.[0]?.secure_url ?? data.pictures?.[0]?.url ?? null,
    }
  } catch {
    return null
  }
}

// Catalog pages (/p/MLAXXX) are geo-blocked from Vercel IPs and the products API needs OAuth.
// With ML_CLIENT_ID + ML_CLIENT_SECRET env vars set, we get a client credentials token
// and call /products/{id} (title + image) + /products/{id}/items?limit=1 (price).
// Falls back to slug-derived title if credentials are absent or the API fails.
async function fetchMercadoLibreProduct(productId: string, pathname: string): Promise<MLResult | null> {
  const token = await getMLToken()
  if (token) {
    try {
      const headers = { Accept: 'application/json', Authorization: `Bearer ${token}` }
      const res = await fetch(`https://api.mercadolibre.com/products/${productId}`, {
        headers, signal: AbortSignal.timeout(6000),
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.name) {
          const image_url: string | null = data.pictures?.[0]?.url ?? null
          let price: number | null = null
          try {
            const ir = await fetch(`https://api.mercadolibre.com/products/${productId}/items?limit=1`, {
              headers, signal: AbortSignal.timeout(4000),
            })
            if (ir.ok) {
              const id = await ir.json()
              const first = id?.results?.[0]
              if (typeof first?.price === 'number') price = first.price
            }
          } catch { /* price stays null */ }
          return { title: data.name as string, price, image_url }
        }
      }
    } catch { /* fall through to slug */ }
  }
  // No credentials or API failed — extract title from URL slug, price/image will be null.
  const m = pathname.match(/\/([^/]+)\/p\//i)
  if (!m) return null
  const title = m[1].split('-').filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || null
  return title ? { title, price: null, image_url: null } : null
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
    // Fast path: MercadoLibre.
    // Regular listing (/MLA123) → public items API: full title, price, image.
    // Catalog page (/p/MLA123) → HTML is geo-blocked from Vercel, products API needs OAuth.
    //   Extract title from URL slug; skip the futile HTML scrape.
    if (ML_HOSTNAME_RE.test(targetUrl.hostname)) {
      const mlMatch = targetUrl.href.match(ML_ITEM_ID_RE)
      if (mlMatch) {
        if (ML_CATALOG_PATH.test(targetUrl.pathname)) {
          const mlData = await fetchMercadoLibreProduct(mlMatch[1], targetUrl.pathname)
          return Response.json({ ...mlData, description: null, url: rawUrl })
        }
        const mlData = await fetchMercadoLibreItem(mlMatch[1])
        if (mlData?.title) {
          return Response.json({ ...mlData, description: null, url: rawUrl })
        }
      }
    }

    // Follow up to 3 redirect hops, re-validating each destination via DNS to prevent
    // redirect-chain SSRF (e.g. public host → 302 → 169.254.169.254).
    // Mercado Libre and similar e-commerce sites often require 2+ hops to reach the product page.
    let currentUrl = targetUrl
    let html = ''
    const MAX_HOPS = 3

    for (let hop = 0; hop <= MAX_HOPS; hop++) {
      const isLastAllowed = hop === MAX_HOPS
      const res = await fetch(currentUrl.toString(), {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(8000),
        redirect: 'manual',
      })

      if (res.status >= 300 && res.status < 400) {
        if (isLastAllowed) return Response.json({ error: 'No se pudo acceder al producto' }, { status: 422 })
        const location = res.headers.get('location')
        if (!location) return Response.json({ error: 'No se pudo acceder al producto' }, { status: 422 })

        let redirectUrl: URL
        try {
          redirectUrl = new URL(location, currentUrl)
        } catch {
          return Response.json({ error: 'URL inválida' }, { status: 400 })
        }

        if (!['http:', 'https:'].includes(redirectUrl.protocol) || await isPrivateHost(redirectUrl.hostname)) {
          return Response.json({ error: 'URL inválida' }, { status: 400 })
        }

        currentUrl = redirectUrl
        continue
      }

      if (!res.ok) return Response.json({ error: 'No se pudo acceder al producto' }, { status: 422 })
      html = await readHtml(res)
      break
    }

    const siteName = getOGTag(html, 'site_name')
    // When og:site_name is absent, derive a site name from the hostname so that bot-block
    // pages (e.g. "<title>Mercado Libre</title>" with no OG tags) are treated as empty title.
    const hostSiteName = siteName ?? currentUrl.hostname.replace(/^www\./, '').split('.')[0]
    const rawTitle = getOGTag(html, 'title') ?? getMetaName(html, 'title') ?? getTagTitle(html)
    return Response.json({
      title:       cleanTitle(rawTitle, hostSiteName),
      description: getOGTag(html, 'description') ?? getMetaName(html, 'description'),
      image_url:   getOGTag(html, 'image'),
      price:       extractPrice(html),
      url:         rawUrl,
    })
  } catch {
    return Response.json({ error: 'No se pudo extraer el producto' }, { status: 500 })
  }
}
