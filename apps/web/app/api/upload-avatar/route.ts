import { NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES      = 2 * 1024 * 1024 // 2 MB

// File signatures. The browser-declared file.type is not trusted on its own.
const SIGNATURES: Record<string, { offset: number; bytes: number[] }[]> = {
  'image/jpeg': [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  'image/png':  [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  'image/gif':  [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }], // "GIF8"
  'image/webp': [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF"
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // "WEBP"
  ],
}

function hasSignature(type: string, head: Uint8Array): boolean {
  return SIGNATURES[type].every(({ offset, bytes }) =>
    bytes.every((byte, i) => head[offset + i] === byte)
  )
}

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

  const bytes = await file.arrayBuffer()
  if (!hasSignature(file.type, new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 12)))) {
    return Response.json({ error: 'El archivo no es una imagen válida.' }, { status: 400 })
  }

  const ext  = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
  const path = `${user.id}/avatar.${ext}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (error) return Response.json({ error: 'No se pudo subir la imagen. Revisá que el bucket exista y tenga políticas de carga.' }, { status: 500 })

  // Drop the previous avatar when its extension changed (e.g. png → jpg). Best-effort: a leftover file is harmless.
  const { data: existing } = await supabase.storage.from('avatars').list(user.id)
  const stale = (existing ?? []).map(f => `${user.id}/${f.name}`).filter(p => p !== path)
  if (stale.length > 0) await supabase.storage.from('avatars').remove(stale)

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

  // Bust the CDN cache by appending a timestamp so the new photo shows immediately
  const url = `${publicUrl}?t=${Date.now()}`

  // Persist the URL on the profile row right away
  await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)

  return Response.json({ url })
}
