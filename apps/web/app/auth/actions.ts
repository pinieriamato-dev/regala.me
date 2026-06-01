'use server'

import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

type AuthState = { error?: string; success?: string } | null

const emailSchema = z.string().email('Ingresá un email válido.')

const passwordSchema = z
  .string()
  .min(6, 'La contraseña debe tener al menos 6 caracteres.')
  .refine(
    (val) => /[a-zA-Z]/.test(val) && /[0-9]/.test(val),
    'La contraseña debe incluir letras y números.'
  )

const signupSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  email: emailSchema,
  password: passwordSchema,
})

const signinSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Ingresá tu contraseña.'),
})

const resetSchema = z.object({
  email: emailSchema,
})

const newPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((val) => val.password === val.confirm, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirm'],
  })

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
  const captchaToken = (formData.get('captchaToken') as string) || undefined
  const supabase = await createServerSupabase()

  if (mode === 'signup') {
    const parsed = signupSchema.safeParse({
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
    })
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { display_name: parsed.data.name },
        emailRedirectTo: `${siteUrl}/auth/callback`,
        captchaToken,
      },
    })
    if (error) return { error: error.message }
    return { success: '¡Cuenta creada! Revisá tu email para confirmar tu dirección.' }
  }

  const parsed = signinSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { captchaToken },
  })
  if (error) return { error: error.message }
  if (!data.user?.email_confirmed_at) {
    await supabase.auth.signOut()
    return { error: 'Necesitás confirmar tu email antes de ingresar. Revisá tu bandeja de entrada.' }
  }
  redirect('/dashboard')
}

export async function requestPasswordReset(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = resetSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const captchaToken = (formData.get('captchaToken') as string) || undefined
  const supabase = await createServerSupabase()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback?type=recovery&next=/auth/reset-password`,
    captchaToken,
  })
  if (error) return { error: error.message }
  return { success: 'Si ese email tiene una cuenta, vas a recibir un link para restablecer tu contraseña.' }
}

export async function updatePassword(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createServerSupabase()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { error: error.message }
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  redirect('/auth')
}
