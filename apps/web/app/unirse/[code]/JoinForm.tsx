'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { joinAmigoGroup } from '@/app/dashboard/amigo/actions'
import type { AmigoResult } from '@/app/dashboard/amigo/actions'

export default function JoinForm({ code, defaultName }: { code: string; defaultName: string }) {
  const router = useRouter()
  const [state, action, pending] = useActionState<AmigoResult, FormData>(joinAmigoGroup, null)

  useEffect(() => {
    if (state && 'redirectTo' in state) router.push(state.redirectTo)
  }, [state, router])

  const busy = pending || (!!state && 'redirectTo' in state)

  return (
    <div className="rg-card" style={{ padding: 28 }}>
      {state && 'error' in state && (
        <p style={{ color: 'var(--red-ink)', fontWeight: 700, fontSize: 13, marginBottom: 16, padding: '10px 14px', border: '2px solid var(--red)' }}>
          {state.error}
        </p>
      )}
      <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <input type="hidden" name="code" value={code} />
        <div>
          <div className="rg-mono" style={{ fontSize: 9, marginBottom: 8, color: 'var(--ink-muted)' }}>
            TU NOMBRE EN EL SORTEO *
          </div>
          <input
            name="display_name"
            type="text"
            required
            minLength={2}
            maxLength={60}
            defaultValue={defaultName}
            className="rg-input"
            style={{ fontSize: 14 }}
          />
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: 0 }}>
          Vas a crear tu propia lista de regalos. Los demás la van a ver cuando les toque regalarte.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="rg-btn rg-btn-primary"
          style={{ width: '100%', padding: '16px', fontSize: 14, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'ENTRANDO...' : 'PARTICIPAR →'}
        </button>
      </form>
    </div>
  )
}
