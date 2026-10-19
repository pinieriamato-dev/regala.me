'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createAmigoGroup } from '@/app/dashboard/amigo/actions'
import type { AmigoResult } from '@/app/dashboard/amigo/actions'

export default function NewGroupForm() {
  const router = useRouter()
  const [state, action, pending] = useActionState<AmigoResult, FormData>(createAmigoGroup, null)

  useEffect(() => {
    if (state && 'redirectTo' in state) router.push(state.redirectTo)
  }, [state, router])

  const busy = pending || (!!state && 'redirectTo' in state)

  return (
    <div className="rg-card" style={{ padding: 28 }}>
      {state && 'error' in state && (
        <p style={{ color: 'var(--red)', fontWeight: 700, fontSize: 13, marginBottom: 16, padding: '10px 14px', border: '2px solid var(--red)' }}>
          {state.error}
        </p>
      )}
      <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <div className="rg-mono" style={{ fontSize: 9, marginBottom: 8, color: 'rgba(15,15,15,0.6)' }}>
            NOMBRE DEL GRUPO *
          </div>
          <input
            name="name"
            type="text"
            required
            maxLength={80}
            placeholder="Ej: Amigo invisible oficina 2026"
            className="rg-input"
            style={{ fontSize: 14 }}
          />
        </div>
        <p style={{ fontSize: 12, color: 'rgba(15,15,15,0.6)', margin: 0 }}>
          Después te damos un link para compartir por WhatsApp. Cada persona que entre crea su propia lista. Cuando estén todos, sorteás.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="rg-btn rg-btn-primary"
          style={{ width: '100%', padding: '16px', fontSize: 14, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'CREANDO...' : 'CREAR GRUPO →'}
        </button>
      </form>
    </div>
  )
}
