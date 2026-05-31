'use client'

import { useTransition, useState } from 'react'
import { createWishlist } from '@/app/dashboard/actions'
import { OCCASIONS, CURRENCIES } from 'shared'
import type { OccasionId, Currency } from 'shared'
import Link from 'next/link'

const PERSONAL = { id: 'personal' as const, label: 'Lista personal', emoji: '✨' }

type Privacy = 'public' | 'link_only' | 'private'

const PRIVACY_OPTIONS: { value: Privacy; emoji: string; label: string; note?: string }[] = [
  { value: 'public',    emoji: '🌍', label: 'PÚBLICA' },
  { value: 'link_only', emoji: '🔗', label: 'SOLO CON LINK' },
  { value: 'private',   emoji: '🔒', label: 'PRIVADA', note: 'Solo vos podés verla.' },
]

export default function NewListPage() {
  const [pending,   startTransition] = useTransition()
  const [occasion,  setOccasion]     = useState<OccasionId | 'personal' | ''>('')
  const [currency,  setCurrency]     = useState<Currency>('ARS')
  const [surprise,  setSurprise]     = useState(false)
  const [privacy,   setPrivacy]      = useState<Privacy>('public')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('occasion', occasion === 'personal' ? '' : occasion)
    fd.set('currency', currency)
    fd.set('privacy_level', privacy)
    if (surprise) fd.set('is_surprise', 'on')
    startTransition(() => createWishlist(fd))
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/dashboard" className="rg-mono" style={{ color: 'rgba(15,15,15,0.5)', textDecoration: 'none', fontSize: 10 }}>
          ← MIS LISTAS
        </Link>
      </div>

      <h1 className="rg-display" style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', marginBottom: 24 }}>
        NUEVA <span className="rg-em">LISTA.</span>
      </h1>

      <div className="rg-card" style={{ padding: 28 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Title */}
          <div>
            <div className="rg-mono" style={{ fontSize: 9, marginBottom: 8, color: 'rgba(15,15,15,0.6)' }}>
              NOMBRE DE LA LISTA *
            </div>
            <input
              name="title"
              type="text"
              required
              placeholder={occasion === 'personal' ? 'Ej: Mi lista de deseos' : 'Ej: Mi cumple 30'}
              className="rg-input"
              style={{ fontSize: 14 }}
            />
          </div>

          {/* Occasion */}
          <div>
            <div className="rg-mono" style={{ fontSize: 9, marginBottom: 10, color: 'rgba(15,15,15,0.6)' }}>
              TIPO DE LISTA
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                onClick={() => setOccasion(occasion === 'personal' ? '' : 'personal')}
                className="rg-btn"
                style={{
                  padding: '8px 14px', fontSize: 11,
                  background: occasion === 'personal' ? 'var(--ink)' : 'var(--paper)',
                  color: occasion === 'personal' ? 'var(--paper)' : 'var(--ink)',
                  border: '2px solid var(--ink)',
                  boxShadow: occasion === 'personal' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {PERSONAL.emoji} {PERSONAL.label.toUpperCase()}
              </button>
              {OCCASIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOccasion(occasion === o.id ? '' : o.id as OccasionId)}
                  className="rg-btn"
                  style={{
                    padding: '8px 14px', fontSize: 11,
                    background: occasion === o.id ? 'var(--ink)' : 'var(--paper)',
                    color: occasion === o.id ? 'var(--paper)' : 'var(--ink)',
                    border: '2px solid var(--ink)',
                    boxShadow: occasion === o.id ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {o.emoji} {o.label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Date — only for events */}
          {occasion !== 'personal' && (
            <div>
              <div className="rg-mono" style={{ fontSize: 9, marginBottom: 8, color: 'rgba(15,15,15,0.6)' }}>
                FECHA DEL EVENTO
              </div>
              <input
                name="occasion_date"
                type="date"
                className="rg-input"
                style={{ fontSize: 14 }}
              />
            </div>
          )}

          {/* Currency */}
          <div>
            <div className="rg-mono" style={{ fontSize: 9, marginBottom: 10, color: 'rgba(15,15,15,0.6)' }}>
              MONEDA
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c as Currency)}
                  className="rg-btn"
                  style={{
                    padding: '8px 14px', fontSize: 11,
                    background: currency === c ? 'var(--ink)' : 'var(--paper)',
                    color: currency === c ? 'var(--paper)' : 'var(--ink)',
                    border: '2px solid var(--ink)',
                    boxShadow: currency === c ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy */}
          <div>
            <div className="rg-mono" style={{ fontSize: 9, marginBottom: 10, color: 'rgba(15,15,15,0.6)' }}>
              PRIVACIDAD
            </div>
            <div style={{ display: 'flex', gap: 0, border: '2px solid var(--ink)', borderRadius: 4, overflow: 'hidden' }}>
              {PRIVACY_OPTIONS.map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPrivacy(opt.value)}
                  className="rg-btn"
                  style={{
                    flex: 1, padding: '10px 8px', fontSize: 10,
                    borderRadius: 0,
                    background: privacy === opt.value ? 'var(--ink)' : 'var(--paper)',
                    color: privacy === opt.value ? 'var(--paper)' : 'var(--ink)',
                    border: 'none',
                    borderRight: i < PRIVACY_OPTIONS.length - 1 ? '2px solid var(--ink)' : 'none',
                    boxShadow: 'none',
                  }}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
            {privacy === 'private' && (
              <div className="rg-mono" style={{ fontSize: 9, marginTop: 8, color: 'rgba(15,15,15,0.5)' }}>
                Solo vos podés verla.
              </div>
            )}
          </div>

          {/* Surprise */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', background: 'var(--bg)',
            border: '2px solid var(--ink)', borderRadius: 4,
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13 }}>Lista sorpresa</div>
              <div style={{ fontSize: 11, color: 'rgba(15,15,15,0.55)', marginTop: 2 }}>
                Vos no ves qué reclamaron hasta el día del evento
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSurprise(!surprise)}
              style={{
                width: 48, height: 26, borderRadius: 13,
                background: surprise ? 'var(--ink)' : 'rgba(15,15,15,0.15)',
                border: '2px solid var(--ink)',
                position: 'relative', cursor: 'pointer', flexShrink: 0,
                transition: 'background 0.15s',
              }}
            >
              <span style={{
                position: 'absolute', top: 2,
                left: surprise ? 22 : 2,
                width: 18, height: 18,
                background: surprise ? 'var(--yellow)' : 'var(--paper)',
                border: '1.5px solid var(--ink)',
                borderRadius: '50%',
                transition: 'left 0.15s',
              }} />
            </button>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="rg-btn rg-btn-primary"
            style={{ width: '100%', padding: '16px', fontSize: 14, opacity: pending ? 0.6 : 1 }}
          >
            {pending ? 'CREANDO...' : 'CREAR LISTA →'}
          </button>
        </form>
      </div>
    </div>
  )
}
