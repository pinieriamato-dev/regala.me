'use client'

import { useRef, useState } from 'react'

// Image URL field with a phone photo upload next to it. The input stays uncontrolled
// with name="image_url", so the link-extractor can still fill it in the add form.
export default function ItemImageField({ defaultValue }: { defaultValue?: string | null }) {
  const urlRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File) => {
    setUploading(true)
    setError('')
    const body = new FormData()
    body.append('file', file)
    try {
      const res = await fetch('/api/upload-item-image', { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'No se pudo subir la imagen'); return }
      if (urlRef.current) urlRef.current.value = data.url
    } catch {
      setError('No se pudo conectar')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        ref={urlRef}
        name="image_url"
        type="url"
        defaultValue={defaultValue ?? ''}
        placeholder="Link de imagen (opcional)"
        className="rg-input"
        style={{ fontSize: 13 }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) handleFile(file)
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="rg-btn rg-btn-ghost"
        style={{ padding: '8px', fontSize: 10, opacity: uploading ? 0.5 : 1 }}
      >
        {uploading ? 'SUBIENDO...' : 'SUBIR FOTO DESDE EL CELULAR'}
      </button>
      {error && <p style={{ fontSize: 11, color: 'var(--red-ink)', fontWeight: 700, margin: 0 }}>{error}</p>}
    </div>
  )
}
