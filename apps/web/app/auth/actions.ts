'use server'

import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type AuthState = { error?: string; success?: string } | null

export async function getGoogleAuthUrl(): Promise<string | null> {
  const supabase = await createServerSupabase()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${siteUrl}/auth/callback`, skipBrowserRedirect: true },
  })
  if (error || !data.url) return null
  return data.url
}

export async function handleAuth(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const mode = formData.get('mode') as string
  const supabase = await createServerSupabase()

  if (mode === 'signup') {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'
    const { error } = await supabase.auth.signUp({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      options: {
        data: { display_name: formData.get('name') as string },
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    })
    if (error) return { error: error.message }
    return { success: '¡Cuenta creada! Revisá tu email para confirmar tu dirección.' }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  if (!data.user?.email_confirmed_at) {
    await supabase.auth.signOut()
    return { error: 'Necesitás confirmar tu email antes de ingresar. Revisá tu bandeja de entrada.' }
  }
  redirect('/dashboard')
}

export async function requestPasswordReset(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createServerSupabase()
  const email = formData.get('email') as string
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?type=recovery&next=/auth/reset-password`,
  })
  if (error) return { error: error.message }
  return { success: 'Si ese email tiene una cuenta, vas a recibir un link para restablecer tu contraseña.' }
}

export async function updatePassword(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string
  if (password !== confirm) return { error: 'Las contraseñas no coinciden.' }
  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  redirect('/auth')
}
