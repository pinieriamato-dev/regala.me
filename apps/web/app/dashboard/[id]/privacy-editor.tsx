'use client'

import { useState, useTransition } from 'react'
import { updatePrivacy } from '@/app/dashboard/actions'

type Privacy = 'public' | 'link_only' | 'private'

const OPTIONS: { value: Privacy; emoji: string; label: string }[] = [
  { value: 'public',    emoji: '🌍', label: 'PÚBLICA' },
  { value: 'link_only', emoji: '🔗', label: 'SOLO LINK' },
  { value: 'private',   emoji: '🔒', label: 'PRIVADA' },
]

export default function PrivacyEditor({ listId, current }: { listId: string; current: Privacy }) {
  const [value,   setValue]   = useState<Privacy>(current)
  const [pending, startTransition] = useTransition()

  const handleChange = (next: Privacy) => {
    if (next === value || pending) return
    setValue(next)
    startTransition(async () => {
      await updatePrivacy(listId, next)
    })
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div className="rg-mono" style={{ fontSize: 9, color: 'rgba(251,248,238,0.5)', marginBottom: 8 }}>
        PRIVACIDAD
      </div>
      <div
        role="group"
        aria-label="Privacidad de la lista"
        style={{
          display: 'flex', border: '1.5px solid rgba(251,248,238,0.3)',
          borderRadius: 4, overflow: 'hidden', opacity: pending ? 0.6 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {OPTIONS.map((opt, i) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={value === opt.value}
            onClick={() => handleChange(opt.value)}
            disabled={pending}
            style={{
              flex: 1, padding: '8px 4px', fontSize: 10, cursor: pending ? 'default' : 'pointer',
              background: value === opt.value ? 'rgba(251,248,238,0.15)' : 'transparent',
              color: 'var(--paper)',
              border: 'none',
              borderRight: i < OPTIONS.length - 1 ? '1.5px solid rgba(251,248,238,0.3)' : 'none',
              fontFamily: 'var(--font-display)', letterSpacing: 0.5,
              fontWeight: value === opt.value ? 800 : 400,
            }}
          >
            {opt.emoji} {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
