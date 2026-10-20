'use client'

import { useActionState, useRef, useState } from 'react'
import { drawAmigoGroup } from '@/app/dashboard/amigo/actions'
import type { AmigoResult } from '@/app/dashboard/amigo/actions'
import ConfirmPanel from '@/components/ConfirmPanel'

export default function DrawButton({ groupId, canDraw, participants }: { groupId: string; canDraw: boolean; participants: number }) {
  const [state, action, pending] = useActionState<AmigoResult, FormData>(drawAmigoGroup, null)
  const [confirming, setConfirming] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // The draw is irreversible, so the first click only asks; the form submits on confirm.
  const handleConfirm = () => {
    setConfirming(false)
    formRef.current?.requestSubmit()
  }

  return (
    <form ref={formRef} action={action} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input type="hidden" name="group_id" value={groupId} />
      {state && 'error' in state && (
        <p style={{ color: 'var(--red-ink)', fontWeight: 700, fontSize: 13, margin: 0 }}>{state.error}</p>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setConfirming(true)}
        disabled={!canDraw || pending}
        className="rg-btn rg-btn-primary"
        style={{ padding: '16px', fontSize: 14, opacity: !canDraw || pending ? 0.5 : 1 }}
      >
        {pending ? 'SORTEANDO...' : 'SORTEAR AHORA →'}
      </button>
      {confirming && (
        <ConfirmPanel
          message={`¿SORTEAMOS? SON ${participants} PERSONAS. NO SE PUEDE DESHACER.`}
          confirmLabel="SÍ, SORTEAR"
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(false)}
          returnFocusRef={triggerRef}
        />
      )}
      {!canDraw && (
        <p className="rg-mono" style={{ fontSize: 9, margin: 0, color: 'var(--ink-muted)' }}>
          HACEN FALTA AL MENOS 3 PARTICIPANTES
        </p>
      )}
    </form>
  )
}
