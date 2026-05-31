'use client'

import { useState, useActionState } from 'react'
import { claimItem } from './actions'

export default function ClaimButton({ itemId }: { itemId: string; listIsSurprise: boolean }) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(claimItem, null)

  if (state?.success) {
    return (
      <span className="rg-sticker rg-sticker-green" style={{ fontSize: 11, padding: '5px 12px' }}>
        ✓ ¡GRACIAS!
      </span>
    )
  }

  if (open) {
    return (
      <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', marginTop: 8 }}>
        <input type="hidden" name="item_id" value={itemId} />
        <input
          className="rg-input"
          name="name"
          placeholder="Tu nombre"
          required
          autoFocus
          style={{ fontSize: 13, padding: '10px 12px' }}
        />
        {state?.error && (
          <p style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, margin: 0 }}>{state.error}</p>
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
