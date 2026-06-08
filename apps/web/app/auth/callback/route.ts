import { createServerSupabase } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/dashboard'
  let next = '/dashboard'
  try {
    const candidate = new URL(rawNext, origin)
    if (candidate.origin === origin) next = candidate.pathname + candidate.search
  } catch {
    // malformed — fall back to /dashboard
  }

  const supabase = await createServerSupabase()

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      const destination = type === 'recovery' ? '/auth/reset-password' : next
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=confirmation_failed`)
}
