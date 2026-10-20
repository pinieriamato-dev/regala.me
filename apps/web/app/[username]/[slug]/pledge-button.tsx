'use client'

import { useState, useActionState, useEffect } from 'react'
import { pledgeToGift } from './actions'

interface Props {
  itemId: string
  remaining: number
  currency: string
  onPledged?: (itemId: string, releaseToken: string | null) => void
}

// One gifter's share of a gift that several people are chipping in for. Payment happens outside the app.
export default function PledgeButton({ itemId, remaining, currency, onPledged }: Props) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(pledgeToGift, null)

  useEffect(() => {
    if (state?.success) onPledged?.(itemId, state.releaseToken ?? null)
  }, [state, itemId, onPledged])

  // The parent re-renders this item with the pledge total right after.
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
        <input
          className="rg-input"
          name="amount"
          placeholder={`Tu parte en ${currency} (máx. ${remaining.toLocaleString('es-AR')})`}
          required
          inputMode="numeric"
          style={{ fontSize: 13, padding: '10px 12px' }}
        />
        {state?.error && (
          <p style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, margin: 0 }}>{state.error}</p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            aria-label="Sumar mi aporte"
            disabled={pending}
            className="rg-btn rg-btn-primary"
            style={{ flex: 1, padding: '12px 16px', fontSize: 12, minHeight: 44, opacity: pending ? 0.6 : 1 }}
          >
            {pending ? '...' : 'SUMO MI APORTE →'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              background: 'none', border: '2px solid var(--ink)', cursor: 'pointer',
              fontSize: 16, color: 'rgba(15,15,15,0.55)',
              padding: '8px 12px', minWidth: 44, borderRadius: 4,
            }}
          >
            ✕
          </button>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(15,15,15,0.45)', textAlign: 'center', margin: 0 }}>
          REGALO COMPARTIDO · EL PAGO SE COORDINA ENTRE VOS Y LOS DEMÁS
        </p>
      </form>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="rg-btn rg-btn-ghost"
      style={{ padding: '7px 12px', fontSize: 11, minHeight: 36 }}
    >
      SUMO MI APORTE →
    </button>
  )
}
