'use client'

import { useState, useTransition } from 'react'
import { updateSurprise } from '@/app/dashboard/actions'

export default function SurpriseToggle({ listId, current }: { listId: string; current: boolean }) {
  const [value,   setValue]        = useState(current)
  const [pending, startTransition] = useTransition()

  const toggle = (next: boolean) => {
    if (next === value || pending) return
    setValue(next)
    startTransition(async () => { await updateSurprise(listId, next) })
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div className="rg-mono" style={{ fontSize: 9, color: 'rgba(251,248,238,0.5)', marginBottom: 8 }}>
        TIPO DE LISTA
      </div>
      <div
        role="group"
        aria-label="Tipo de lista"
        style={{
          display: 'flex', border: '1.5px solid rgba(251,248,238,0.3)',
          borderRadius: 4, overflow: 'hidden', opacity: pending ? 0.6 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {([false, true] as const).map((val, i) => (
          <button
            key={String(val)}
            type="button"
            aria-pressed={value === val}
            onClick={() => toggle(val)}
            disabled={pending}
            style={{
              flex: 1, padding: '8px 4px', fontSize: 10,
              cursor: pending ? 'default' : 'pointer',
              background: value === val ? 'rgba(251,248,238,0.15)' : 'transparent',
              color: 'var(--paper)',
              border: 'none',
              borderRight: i === 0 ? '1.5px solid rgba(251,248,238,0.3)' : 'none',
              fontFamily: 'var(--font-display)', letterSpacing: 0.5,
              fontWeight: value === val ? 800 : 400,
            }}
          >
            {val ? '🎁 SORPRESA' : '📋 NORMAL'}
          </button>
        ))}
      </div>
      {value && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(251,248,238,0.4)', margin: '8px 0 0' }}>
          Los regalados no verán quién ya reclamó cada ítem.
        </p>
      )}
    </div>
  )
}
