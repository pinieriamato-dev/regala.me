'use client'

import { useState, useTransition } from 'react'
import { updatePrivacy } from '@/app/dashboard/actions'

type Privacy = 'public' | 'link_only' | 'private' | 'friends'

const OPTIONS: { value: Privacy; emoji: string; label: string }[] = [
  { value: 'public',    emoji: '🌍', label: 'PÚBLICA' },
  { value: 'friends',   emoji: '👥', label: 'SOLO AMIGOS' },
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
      <div className="rg-mono" style={{ fontSize: 9, color: 'var(--paper-muted)', marginBottom: 8 }}>
        PRIVACIDAD
      </div>
      <div
        role="group"
        aria-label="Privacidad de la lista"
        className="rg-seg"
        style={{ opacity: pending ? 0.6 : 1, transition: 'opacity 0.15s' }}
      >
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={value === opt.value}
            onClick={() => handleChange(opt.value)}
            disabled={pending}
          >
            {opt.emoji} {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
