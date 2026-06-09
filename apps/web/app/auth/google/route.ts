import { createServerSupabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin
  const supabase = await createServerSupabase()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${siteUrl}/auth/callback` },
  })

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/auth?error=oauth_failed`)
  }

  return NextResponse.redirect(data.url)
}
