import { createServerSupabase } from '@/lib/supabase/server'
import { safeNext } from '@/lib/safe-next'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? origin).replace(/\/$/, '')
  const next = safeNext(request.nextUrl.searchParams.get('next'))
  const supabase = await createServerSupabase()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: next === '/dashboard'
        ? `${siteUrl}/auth/callback`
        : `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/auth?error=oauth_failed`)
  }

  return NextResponse.redirect(data.url)
}
