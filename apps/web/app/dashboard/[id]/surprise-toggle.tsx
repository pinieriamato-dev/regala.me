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
      <div className="rg-mono" style={{ fontSize: 9, color: 'var(--paper-muted)', marginBottom: 8 }}>
        TIPO DE LISTA
      </div>
      <div
        role="group"
        aria-label="Tipo de lista"
        className="rg-seg"
        style={{ opacity: pending ? 0.6 : 1, transition: 'opacity 0.15s' }}
      >
        {([false, true] as const).map(val => (
          <button
            key={String(val)}
            type="button"
            aria-pressed={value === val}
            onClick={() => toggle(val)}
            disabled={pending}
          >
            {val ? '🎁 SORPRESA' : '📋 NORMAL'}
          </button>
        ))}
      </div>
      {value && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--paper-muted)', margin: '8px 0 0' }}>
          Los regalados no verán quién ya reclamó cada ítem.
        </p>
      )}
    </div>
  )
}
