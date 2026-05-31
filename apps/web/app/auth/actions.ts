'use server'

import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type AuthState = { error?: string; success?: string } | null

export async function handleAuth(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const mode = formData.get('mode') as string
  const supabase = await createServerSupabase()

  if (mode === 'signup') {
    const { error } = await supabase.auth.signUp({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      options: { data: { display_name: formData.get('name') as string } },
    })
    if (error) return { error: error.message }
    return { success: '¡Cuenta creada! Revisá tu email para confirmar.' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  redirect('/auth')
}
