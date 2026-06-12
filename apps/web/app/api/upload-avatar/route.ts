import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES      = 2 * 1024 * 1024 // 2 MB

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return Response.json({ error: 'No se recibió ningún archivo.' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: 'Solo se aceptan imágenes JPG, PNG, WebP o GIF.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'La imagen no puede superar 2 MB.' }, { status: 400 })
  }

  const ext  = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
  const path = `${user.id}/avatar.${ext}`
  const bytes = await file.arrayBuffer()

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (error) return Response.json({ error: 'No se pudo subir la imagen. Revisá que el bucket exista y tenga políticas de carga.' }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

  // Bust the CDN cache by appending a timestamp so the new photo shows immediately
  const url = `${publicUrl}?t=${Date.now()}`

  // Persist the URL on the profile row right away
  await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)

  return Response.json({ url })
}
