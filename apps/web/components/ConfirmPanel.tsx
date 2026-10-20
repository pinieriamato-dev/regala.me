'use client'

import { useEffect, useId, useRef, type RefObject } from 'react'

type Props = {
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  // Element that opened the panel; focus goes back to it when the panel closes.
  returnFocusRef?: RefObject<HTMLElement | null>
}

// Inline confirmation for destructive or irreversible actions. Replaces window.confirm
// so the copy, styling and focus handling stay consistent across the dashboard.
export default function ConfirmPanel({ message, confirmLabel, onConfirm, onCancel, returnFocusRef }: Props) {
  const messageId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
    return () => {
      const el = returnFocusRef?.current
      if (el?.isConnected) el.focus()
    }
  }, [returnFocusRef])

  return (
    <div
      role="alertdialog"
      aria-labelledby={messageId}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          onCancel()
        }
      }}
      style={{
        marginTop: 10, padding: '12px', background: 'var(--yellow)',
        border: '2px solid var(--ink)', display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <p id={messageId} className="rg-mono" style={{ fontSize: 11, margin: 0, color: 'var(--ink)' }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={onConfirm}
          className="rg-btn rg-btn-primary"
          style={{ flex: 1, minHeight: 44, padding: '8px', fontSize: 11 }}
        >
          {confirmLabel}
        </button>
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          className="rg-btn rg-btn-ghost"
          style={{ flex: 1, minHeight: 44, padding: '8px', fontSize: 11 }}
        >
          CANCELAR
        </button>
      </div>
    </div>
  )
}
