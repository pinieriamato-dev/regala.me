'use client'

import { useState, useActionState, useEffect, useId, useRef } from 'react'
import { claimItem } from './actions'

interface Props {
  itemId: string
  onClaimed?: (itemId: string, releaseToken: string | null) => void
}

export default function ClaimButton({ itemId, onClaimed }: Props) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(claimItem, null)
  const uid = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  // Set on cancel so focus goes back to the trigger once it re-mounts.
  const restoreFocus = useRef(false)

  useEffect(() => {
    if (state?.success) onClaimed?.(itemId, state.releaseToken ?? null)
  }, [state, itemId, onClaimed])

  useEffect(() => {
    if (!open && restoreFocus.current) {
      restoreFocus.current = false
      triggerRef.current?.focus()
    }
  }, [open])

  // The parent re-renders this item as claimed (with the thank-you nudge) right after.
  if (state?.success) return null

  if (open) {
    return (
      <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', marginTop: 8 }}>
        <input type="hidden" name="item_id" value={itemId} />
        <label htmlFor={`${uid}-name`} className="sr-only">Tu nombre</label>
        <input
          id={`${uid}-name`}
          className="rg-input"
          name="name"
          placeholder="Tu nombre"
          required
          minLength={2}
          maxLength={60}
          autoComplete="name"
          enterKeyHint="send"
          autoFocus
          aria-invalid={!!state?.error || undefined}
          aria-describedby={state?.error ? `${uid}-err` : undefined}
          style={{ fontSize: 13, padding: '10px 12px' }}
        />
        {state?.error && (
          <p id={`${uid}-err`} role="alert" style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, margin: 0 }}>{state.error}</p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            disabled={pending}
            className="rg-btn rg-btn-primary"
            style={{ flex: 1, padding: '12px 16px', fontSize: 12, minHeight: 44, opacity: pending ? 0.6 : 1 }}
          >
            {pending ? '...' : 'ME ENCARGO →'}
          </button>
          <button
            type="button"
            aria-label="Cancelar"
            onClick={() => { restoreFocus.current = true; setOpen(false) }}
            style={{
              background: 'none', border: '2px solid var(--ink)', cursor: 'pointer',
              fontSize: 16, color: 'rgba(15,15,15,0.55)',
              padding: '8px 12px', minWidth: 44, borderRadius: 4,
            }}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(15,15,15,0.45)', textAlign: 'center', margin: 0 }}>
          NO HACE FALTA CREAR CUENTA
        </p>
      </form>
    )
  }

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={() => setOpen(true)}
      className="rg-btn rg-btn-primary"
      style={{ padding: '12px 16px', fontSize: 12, minHeight: 44 }}
    >
      ME ENCARGO →
    </button>
  )
}
