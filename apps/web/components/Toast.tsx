'use client'

import { useEffect, useState } from 'react'

type Props = {
  message: string | null | undefined
  // Pass the action state here: it changes on every submit, so the same message shows again on the next save.
  token: unknown
  duration?: number
}

// A short confirmation that hides itself. The live region stays mounted so screen readers announce each message.
export function Toast({ message, token, duration = 3500 }: Props) {
  const [shown, setShown] = useState<string | null>(null)

  useEffect(() => {
    if (!message) {
      setShown(null)
      return
    }
    setShown(message)
    const timer = setTimeout(() => setShown(null), duration)
    return () => clearTimeout(timer)
  }, [message, token, duration])

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 50, pointerEvents: 'none' }}
    >
      {shown && <div className="rg-toast">✓ {shown}</div>}
    </div>
  )
}
