'use server'

import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSlug } from 'shared'
import { z } from 'zod'
import { AMIGO_LIST_TITLE_PREFIX } from '@/lib/amigo'

const groupNameSchema = z.string().trim().min(1, 'Ponele un nombre al grupo.').max(80, 'El nombre es muy largo.')
const displayNameSchema = z.string().trim().min(2, 'Escribí tu nombre.').max(60, 'El nombre es muy largo.')

export type AmigoResult = { error: string } | { redirectTo: string } | null

// Postgres errors from the sa_* functions come back as their exception message.
function friendlyError(message: string | undefined): string {
  if (message?.includes('already_drawn')) return 'Ya se sorteó. No se puede volver a entrar.'
  if (message?.includes('not_enough_members')) return 'Hacen falta al menos 3 participantes para sortear.'
  if (message?.includes('group_not_found')) return 'No encontramos este grupo. Revisá el link.'
  if (message?.includes('not_owner')) return 'Solo quien creó el grupo puede sortear.'
  return 'Algo salió mal. Intentá de nuevo.'
}

export async function createAmigoGroup(_prevState: AmigoResult, formData: FormData): Promise<AmigoResult> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const parsed = groupNameSchema.safeParse(formData.get('name') ?? '')
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Nombre inválido.' }

  const { data, error } = await supabase.rpc('sa_create_group', { p_name: parsed.data })
  if (error || !data) return { error: friendlyError(error?.message) }

  revalidatePath('/dashboard/amigo')
  return { redirectTo: `/dashboard/amigo/${(data as { id: string }).id}` }
}

export async function joinAmigoGroup(_prevState: AmigoResult, formData: FormData): Promise<AmigoResult> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const code = String(formData.get('code') ?? '')
  const parsed = displayNameSchema.safeParse(formData.get('display_name') ?? '')
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Nombre inválido.' }

  // The participant's own list: named after the group so it is easy to tell apart from their other lists.
  const title = `${AMIGO_LIST_TITLE_PREFIX}${parsed.data}`
  const { data: groupId, error } = await supabase.rpc('sa_join_group', {
    p_invite_code: code,
    p_display_name: parsed.data,
    p_title: title,
    p_slug: createSlug(title),
  })
  if (error || !groupId) return { error: friendlyError(error?.message) }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/amigo')
  return { redirectTo: `/dashboard/amigo/${groupId}` }
}

export async function drawAmigoGroup(_prevState: AmigoResult, formData: FormData): Promise<AmigoResult> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const groupId = String(formData.get('group_id') ?? '')
  const { error } = await supabase.rpc('sa_draw', { p_group_id: groupId })
  if (error) return { error: friendlyError(error.message) }

  revalidatePath(`/dashboard/amigo/${groupId}`)
  return null
}
