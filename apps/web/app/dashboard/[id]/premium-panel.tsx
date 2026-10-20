'use client'

import { useRef, useState, useTransition } from 'react'
import { removeCover, updateCover, updateSlug } from '@/app/dashboard/actions'

type Props = {
  listId: string
  username: string
  isPremium: boolean
  coverUrl: string | null
  slug: string
  privacyLevel: 'public' | 'link_only' | 'private' | 'friends'
}

export default function PremiumPanel({ listId, username, isPremium, coverUrl, slug, privacyLevel }: Props) {
  if (!isPremium) {
    return (
      <div className="rg-card" style={{ padding: '18px 20px', marginBottom: 24 }}>
        <div className="rg-mono" style={{ fontSize: 9, marginBottom: 8 }}>PREMIUM POR EVENTO</div>
        <p style={{ fontSize: 14, margin: '0 0 10px' }}>
          Portada para tu evento, invitación con código QR y URL propia. <strong>ARS 12.000, pago único por evento.</strong>
        </p>
        <p className="rg-mono" style={{ fontSize: 9, color: 'rgba(15,15,15,0.5)', margin: 0 }}>
          EL PAGO DESDE LA APP LLEGA PRONTO. POR AHORA LO ACTIVAMOS A MANO.
        </p>
      </div>
    )
  }

  return (
    <div className="rg-card" style={{ padding: '18px 20px', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="rg-mono" style={{ fontSize: 9 }}>PREMIUM ACTIVO</div>
      <CoverEditor listId={listId} coverUrl={coverUrl} />
      <SlugEditor listId={listId} username={username} slug={slug} privacyLevel={privacyLevel} />
    </div>
  )
}

function CoverEditor({ listId, coverUrl }: { listId: string; coverUrl: string | null }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const handleFile = async (file: File) => {
    setUploading(true)
    setError('')
    const body = new FormData()
    body.append('file', file)
    body.append('kind', 'cover')
    try {
      const res = await fetch('/api/upload-item-image', { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'No se pudo subir la imagen'); return }
      const result = await updateCover(listId, data.url)
      if (result.error) setError(result.error)
    } catch {
      setError('No se pudo conectar')
    } finally {
      setUploading(false)
    }
  }

  const busy = uploading || pending

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="rg-mono" style={{ fontSize: 9, color: 'rgba(15,15,15,0.5)' }}>PORTADA</div>
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="Portada del evento" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', border: '2px solid var(--ink)' }} />
      )}
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
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="rg-btn rg-btn-ghost"
          style={{ flex: 1, padding: '8px', fontSize: 10, opacity: busy ? 0.5 : 1 }}
        >
          {uploading ? 'SUBIENDO...' : coverUrl ? 'CAMBIAR PORTADA' : 'SUBIR PORTADA'}
        </button>
        {coverUrl && (
          <button
            type="button"
            onClick={() => startTransition(async () => {
              const result = await removeCover(listId)
              if (result.error) setError(result.error)
            })}
            disabled={busy}
            className="rg-btn rg-btn-ghost"
            style={{ padding: '8px 12px', fontSize: 10, opacity: busy ? 0.5 : 1 }}
          >
            QUITAR
          </button>
        )}
      </div>
      {error && <p role="alert" className="rg-mono" style={{ fontSize: 9, color: 'var(--red)', margin: 0 }}>{error}</p>}
    </div>
  )
}

function SlugEditor({ listId, username, slug, privacyLevel }: { listId: string; username: string; slug: string; privacyLevel: Props['privacyLevel'] }) {
  const [value, setValue] = useState(slug)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  if (privacyLevel === 'link_only') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="rg-mono" style={{ fontSize: 9, color: 'rgba(15,15,15,0.5)' }}>URL PROPIA</div>
        <p className="rg-mono" style={{ fontSize: 9, margin: 0 }}>
          LAS LISTAS CON LINK PRIVADO MANTIENEN SU URL ALEATORIA.
        </p>
      </div>
    )
  }

  return (
    <form
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          const result = await updateSlug(listId, value)
          setMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: 'URL guardada.' })
        })
      }}
    >
      <div className="rg-mono" style={{ fontSize: 9, color: 'rgba(15,15,15,0.5)' }}>URL PROPIA</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span className="rg-mono" style={{ fontSize: 11 }}>regala.me/{username}/</span>
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setMessage(null) }}
          className="rg-input"
          style={{ flex: 1, minWidth: 140, fontSize: 13 }}
          aria-label="URL propia de la lista"
          maxLength={40}
        />
      </div>
      <button type="submit" disabled={pending} className="rg-btn rg-btn-ghost" style={{ padding: '8px', fontSize: 10, opacity: pending ? 0.5 : 1 }}>
        {pending ? 'GUARDANDO...' : 'GUARDAR URL'}
      </button>
      {message && (
        <p role="status" className="rg-mono" style={{ fontSize: 9, margin: 0, color: message.ok ? 'var(--ink)' : 'var(--red)' }}>
          {message.text}
        </p>
      )}
    </form>
  )
}
