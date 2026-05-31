'use client'

import { useTransition, useState, useRef } from 'react'
import { addItem } from '@/app/dashboard/actions'

const PRIORITIES = [
  { value: 1, label: 'OPCIONAL' },
  { value: 2, label: 'ME GUSTA' },
  { value: 3, label: 'ESENCIAL' },
]

type ExtractedProduct = {
  title?: string | null
  description?: string | null
  price?: number | null
  url?: string | null
}

export default function AddItemForm({ listId, currency }: { listId: string; currency: string }) {
  const [open,         setOpen]         = useState(false)
  const [priority,     setPriority]     = useState(1)
  const [pending,      startTransition] = useTransition()
  const [extractUrl,   setExtractUrl]   = useState('')
  const [extracting,   setExtracting]   = useState(false)
  const [extractError, setExtractError] = useState('')
  const [extracted,    setExtracted]    = useState<ExtractedProduct | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const handleExtract = async () => {
    if (!extractUrl.trim()) return
    setExtracting(true)
    setExtractError('')
    setExtracted(null)
    try {
      const res = await fetch(`/api/extract-product?url=${encodeURIComponent(extractUrl.trim())}`)
      const data = await res.json()
      if (!res.ok) { setExtractError(data.error ?? 'Error al extraer'); return }
      setExtracted(data)
      if (formRef.current) {
        const form = formRef.current
        const set = (name: string, value: string) => {
          const el = form.elements.namedItem(name) as HTMLInputElement | null
          if (el) el.value = value
        }
        if (data.title)       set('title', data.title)
        if (data.description) set('description', data.description.slice(0, 200))
        if (data.price)       set('price', String(Math.round(data.price)))
        set('url', extractUrl.trim())
      }
    } catch {
      setExtractError('No se pudo conectar')
    } finally {
      setExtracting(false)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('priority', String(priority))
    startTransition(async () => {
      await addItem(listId, fd)
      formRef.current?.reset()
      setPriority(1)
      setExtractUrl('')
      setExtracted(null)
      setExtractError('')
      setOpen(false)
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rg-btn rg-btn-ghost"
        style={{ width: '100%', padding: '16px', fontSize: 12, border: '2px dashed var(--ink)' }}
      >
        + AGREGAR ÍTEM
      </button>
    )
  }

  return (
    <div className="rg-card" style={{ padding: 22 }}>
      <div className="rg-mono" style={{ fontSize: 10, marginBottom: 18 }}>NUEVO ÍTEM</div>

      {/* URL extractor */}
      <div className="rg-card-yellow" style={{ padding: 16, marginBottom: 20 }}>
        <div className="rg-mono" style={{ fontSize: 9, marginBottom: 10, color: 'rgba(15,15,15,0.7)' }}>
          🔗 PEGÁ EL LINK → LO LLENAMOS AUTOMÁTICAMENTE
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="url"
            value={extractUrl}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExtractUrl(e.target.value)}
            placeholder="https://www.mercadolibre.com.ar/..."
            className="rg-input"
            style={{ fontSize: 12, padding: '8px 12px' }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleExtract() } }}
          />
          <button
            type="button"
            onClick={handleExtract}
            disabled={extracting || !extractUrl.trim()}
            className="rg-btn rg-btn-primary"
            style={{ padding: '8px 14px', fontSize: 11, whiteSpace: 'nowrap', opacity: (extracting || !extractUrl.trim()) ? 0.4 : 1 }}
          >
            {extracting ? '...' : 'EXTRAER'}
          </button>
        </div>
        {extractError && (
          <p style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, marginTop: 8, margin: '8px 0 0' }}>
            {extractError}
          </p>
        )}
        {extracted && (
          <p className="rg-mono" style={{ fontSize: 9, color: 'var(--ink)', marginTop: 8, margin: '8px 0 0' }}>
            ✓ DATOS EXTRAÍDOS. REVISÁ Y AJUSTÁ SI HACE FALTA.
          </p>
        )}
      </div>

      {/* Manual form */}
      <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          name="title"
          type="text"
          required
          placeholder="Nombre del regalo *"
          className="rg-input"
          style={{ fontSize: 13 }}
        />
        <input
          name="description"
          type="text"
          placeholder="Descripción breve (opcional)"
          className="rg-input"
          style={{ fontSize: 13 }}
        />
        <input
          name="price"
          type="number"
          min="0"
          step="any"
          placeholder={`Precio en ${currency}`}
          className="rg-input"
          style={{ fontSize: 13 }}
        />
        <input
          name="url"
          type="url"
          placeholder="Link al producto (opcional)"
          className="rg-input"
          style={{ fontSize: 13 }}
        />

        <div>
          <div className="rg-mono" style={{ fontSize: 9, marginBottom: 8, color: 'rgba(15,15,15,0.6)' }}>PRIORIDAD</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className="rg-btn"
                style={{
                  flex: 1, padding: '8px', fontSize: 10,
                  background: priority === p.value ? 'var(--ink)' : 'var(--paper)',
                  color: priority === p.value ? 'var(--paper)' : 'var(--ink)',
                  border: '2px solid var(--ink)',
                  boxShadow: priority === p.value ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button
            type="button"
            onClick={() => { setOpen(false); setExtractUrl(''); setExtracted(null); setExtractError('') }}
            className="rg-btn rg-btn-ghost"
            style={{ flex: 1, padding: '12px', fontSize: 12 }}
          >
            CANCELAR
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rg-btn rg-btn-primary"
            style={{ flex: 1, padding: '12px', fontSize: 12, opacity: pending ? 0.6 : 1 }}
          >
            {pending ? '...' : 'AGREGAR ÍTEM'}
          </button>
        </div>
      </form>
    </div>
  )
}
