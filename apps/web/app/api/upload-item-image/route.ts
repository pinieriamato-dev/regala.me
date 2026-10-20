import { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createServerSupabase } from '@/lib/supabase/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES      = 2 * 1024 * 1024 // 2 MB

// Item photos and event covers go in the avatars bucket under the owner's folder, so the
// existing owner-scoped upload policy covers them without a new bucket. Move them to a
// dedicated bucket later if the avatars policy gets tighter.
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

  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
  const folder = formData.get('kind') === 'cover' ? 'covers' : 'items'
  const path = `${user.id}/${folder}/${randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, await file.arrayBuffer(), { contentType: file.type })

  if (error) return Response.json({ error: 'No se pudo subir la imagen. Probá de nuevo en un rato.' }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
  return Response.json({ url: publicUrl })
}
