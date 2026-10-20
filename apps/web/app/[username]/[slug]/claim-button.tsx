'use client'

import { useState, useActionState, useEffect } from 'react'
import { claimItem } from './actions'

interface Props {
  itemId: string
  onClaimed?: (itemId: string, releaseToken: string | null) => void
}

export default function ClaimButton({ itemId, onClaimed }: Props) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(claimItem, null)

  useEffect(() => {
    if (state?.success) onClaimed?.(itemId, state.releaseToken ?? null)
  }, [state, itemId, onClaimed])

  // The parent re-renders this item as claimed (with the thank-you nudge) right after.
  if (state?.success) return null

  if (open) {
    return (
      <form aria-live="polite" aria-atomic="true" action={action} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', marginTop: 8 }}>
        <input type="hidden" name="item_id" value={itemId} />
        <input
          className="rg-input"
          name="name"
          placeholder="Tu nombre"
          required
          minLength={2}
          maxLength={60}
          autoComplete="given-name"
          autoFocus
          style={{ fontSize: 13, padding: '10px 12px' }}
        />
        {state?.error && (
          <p style={{ fontSize: 11, color: 'var(--red-ink)', fontWeight: 700, margin: 0 }}>{state.error}</p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            aria-label="Reclamar este regalo"
            disabled={pending}
            className="rg-btn rg-btn-primary"
            style={{ flex: 1, padding: '12px 16px', fontSize: 12, minHeight: 44, opacity: pending ? 0.6 : 1 }}
          >
            {pending ? '...' : 'ME ENCARGO →'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              background: 'none', border: '2px solid var(--ink)', cursor: 'pointer',
              fontSize: 16, color: 'var(--ink-muted)',
              padding: '8px 12px', minWidth: 44, borderRadius: 4,
            }}
          >
            ✕
          </button>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-muted)', textAlign: 'center', margin: 0 }}>
          NO HACE FALTA CREAR CUENTA
        </p>
      </form>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="rg-btn rg-btn-primary"
      style={{ padding: '12px 16px', fontSize: 12, minHeight: 44 }}
    >
      ME ENCARGO →
    </button>
  )
}
