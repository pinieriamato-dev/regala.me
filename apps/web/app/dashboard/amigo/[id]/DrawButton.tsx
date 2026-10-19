'use client'

import { useActionState } from 'react'
import { drawAmigoGroup } from '@/app/dashboard/amigo/actions'
import type { AmigoResult } from '@/app/dashboard/amigo/actions'

export default function DrawButton({ groupId, canDraw }: { groupId: string; canDraw: boolean }) {
  const [state, action, pending] = useActionState<AmigoResult, FormData>(drawAmigoGroup, null)

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input type="hidden" name="group_id" value={groupId} />
      {state && 'error' in state && (
        <p style={{ color: 'var(--red)', fontWeight: 700, fontSize: 13, margin: 0 }}>{state.error}</p>
      )}
      <button
        type="submit"
        disabled={!canDraw || pending}
        className="rg-btn rg-btn-primary"
        style={{ padding: '16px', fontSize: 14, opacity: !canDraw || pending ? 0.5 : 1 }}
      >
        {pending ? 'SORTEANDO...' : 'SORTEAR AHORA →'}
      </button>
      {!canDraw && (
        <p className="rg-mono" style={{ fontSize: 9, margin: 0, color: 'rgba(15,15,15,0.5)' }}>
          HACEN FALTA AL MENOS 3 PARTICIPANTES
        </p>
      )}
    </form>
  )
}
