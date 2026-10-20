'use client'

import { useRef, useState, useTransition } from 'react'
import ConfirmPanel from '@/components/ConfirmPanel'

interface Props {
  action: () => Promise<void>
}

export default function DeleteWishlistButton({ action }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()
  const triggerRef = useRef<HTMLButtonElement>(null)

  const handleConfirm = () => {
    setConfirming(false)
    startTransition(() => { action() })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0 }}>
      <button
        ref={triggerRef}
        type="button"
        className="rg-btn rg-btn-ghost"
        style={{ padding: '0 14px', minHeight: 44, fontSize: 11, opacity: pending ? 0.5 : 1 }}
        onClick={() => setConfirming(true)}
        disabled={pending}
      >
        {pending ? 'ELIMINANDO...' : 'ELIMINAR'}
      </button>
      {confirming && (
        <div style={{ width: '100%' }}>
          <ConfirmPanel
            message="¿ELIMINAR ESTA LISTA? NO SE PUEDE DESHACER."
            confirmLabel="SÍ, ELIMINAR"
            onConfirm={handleConfirm}
            onCancel={() => setConfirming(false)}
            returnFocusRef={triggerRef}
          />
        </div>
      )}
    </div>
  )
}
