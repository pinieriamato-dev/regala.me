'use client'

import { useTransition } from 'react'

interface Props {
  action: () => Promise<void>
}

export default function DeleteWishlistButton({ action }: Props) {
  const [pending, startTransition] = useTransition()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!confirm('¿Eliminar esta lista?')) {
      e.preventDefault()
      return
    }
    startTransition(() => { action() })
  }

  return (
    <button
      type="button"
      className="rg-btn rg-btn-ghost"
      style={{ padding: '8px 14px', fontSize: 11, opacity: pending ? 0.5 : 1 }}
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? 'ELIMINANDO...' : 'ELIMINAR'}
    </button>
  )
}
