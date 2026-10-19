import { after } from 'next/server'

type EventProps = Record<string, string | number | boolean | null>

// Server-side PostHog capture over its HTTP API: no SDK, nothing shipped to the browser.
// No-op unless POSTHOG_KEY is set, so local dev and previews without the key stay silent.
// Never pass names, emails or other personal data in props.
export function trackEvent(event: string, distinctId: string, props: EventProps = {}): void {
  const key = process.env.POSTHOG_KEY
  if (!key) return
  const host = process.env.POSTHOG_HOST || 'https://us.i.posthog.com'

  // after() keeps the request from waiting on analytics and keeps the send alive on serverless.
  after(async () => {
    try {
      await fetch(`${host}/capture/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: key,
          event,
          distinct_id: distinctId,
          properties: { ...props, $lib: 'regala-server' },
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(3000),
      })
    } catch {
      // Analytics must never break a user action.
    }
  })
}
