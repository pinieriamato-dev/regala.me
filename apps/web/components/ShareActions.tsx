'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  url: string
  title: string
  compact?: boolean
}

// Copy the link or open the system share sheet (Instagram, Telegram, mail…). WhatsApp stays a separate link in each page.
export default function ShareActions({ url, title, compact = false }: Props) {
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Checked after mount so the server render and the first client render match.
  useEffect(() => {
    setCanShare('share' in navigator)
  }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      inputRef.current?.select()
    }
  }

  const share = async () => {
    try {
      await navigator.share({ title, url })
    } catch {
      // The user closed the share sheet.
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!compact && (
        <input
          ref={inputRef}
          readOnly
          value={url}
          aria-label="Link de tu lista"
          className="rg-input"
          onFocus={e => e.currentTarget.select()}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 400 }}
        />
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button
          type="button"
          onClick={copy}
          className="rg-btn rg-btn-yellow"
          style={{ padding: '10px 14px', fontSize: 11, background: copied ? 'var(--green)' : undefined }}
        >
          {copied ? '✓ ¡COPIADO!' : 'COPIAR LINK'}
        </button>
        {canShare && (
          <button type="button" onClick={share} className="rg-btn rg-btn-ghost" style={{ padding: '10px 14px', fontSize: 11 }}>
            COMPARTIR…
          </button>
        )}
        <span role="status" className="sr-only">{copied ? 'Link copiado' : ''}</span>
      </div>
    </div>
  )
}
