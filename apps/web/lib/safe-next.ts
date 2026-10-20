// Only same-origin paths survive a ?next= round trip. "//evil.com", "/\evil.com"
// and absolute URLs fall back, so a crafted link can't bounce people off-site.
const BASE = 'http://localhost'

export function safeNext(raw: FormDataEntryValue | null | undefined, fallback = '/dashboard'): string {
  if (typeof raw !== 'string' || !raw.startsWith('/')) return fallback
  try {
    const candidate = new URL(raw, BASE)
    if (candidate.origin === BASE) return candidate.pathname + candidate.search
  } catch {
    // malformed — fall back
  }
  return fallback
}
