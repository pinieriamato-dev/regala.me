// Mercado Libre affiliate tracking for product links (roadmap L1).
// NEXT_PUBLIC_ML_AFFILIATE_QUERY holds the query string from the ML Afiliados panel,
// e.g. "matt_tool=12345&matt_word=regalame". Unset means links go out untouched.
const ML_HOSTNAME_RE = /(^|\.)mercadolibre\.[a-z.]+$/i

// Only [A-Za-z0-9_.-] keys and values pass, so a malformed env var can't inject anything.
const SAFE_PARAM_RE = /^[A-Za-z0-9_.-]+$/

function affiliateParams(): [string, string][] {
  const raw = (process.env.NEXT_PUBLIC_ML_AFFILIATE_QUERY ?? '').replace(/^[?&]+/, '')
  if (!raw) return []
  return [...new URLSearchParams(raw)].filter(
    ([key, value]) => SAFE_PARAM_RE.test(key) && SAFE_PARAM_RE.test(value),
  )
}

export function withAffiliateTag(url: string): string {
  const params = affiliateParams()
  if (params.length === 0) return url
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return url
    if (!ML_HOSTNAME_RE.test(parsed.hostname)) return url
    for (const [key, value] of params) parsed.searchParams.set(key, value)
    return parsed.toString()
  } catch {
    return url
  }
}
