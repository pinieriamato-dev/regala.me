'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type Props = {
  name: string
  username: string | null
  slug: string | null
}

type Phase = 'covered' | 'revealing' | 'revealed'

// The result stays covered until the organizer taps, so nobody nearby sees the name by accident.
export default function RevealAssignment({ name, username, slug }: Props) {
  const [phase, setPhase] = useState<Phase>('covered')
  const nameRef = useRef<HTMLDivElement>(null)

  const reveal = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setPhase(reduced ? 'revealed' : 'revealing')
  }

  // Move focus to the name once it's visible, so screen readers and keyboards land on the result.
  useEffect(() => {
    if (phase === 'revealed') nameRef.current?.focus()
  }, [phase])

  return (
    <div className="rg-card-yellow" style={{ padding: 24, marginBottom: 24 }}>
      <div className="rg-mono" style={{ fontSize: 9, marginBottom: 8 }}>LE REGALÁS A</div>

      {phase === 'covered' && (
        <button
          type="button"
          onClick={reveal}
          className="rg-img-ph rg-btn"
          style={{ width: '100%', minHeight: 96, marginBottom: 16, fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--ink)', cursor: 'pointer', background: 'var(--paper)' }}
        >
          TOCÁ PARA VER A QUIÉN LE REGALÁS
        </button>
      )}

      {phase !== 'covered' && (
        <div
          ref={nameRef}
          tabIndex={-1}
          role="status"
          className={phase === 'revealed' ? 'rg-stamp-in' : undefined}
          style={{ position: 'relative', outline: 'none', marginBottom: 16 }}
        >
          <div className="rg-display" style={{ fontSize: 40, lineHeight: 1 }}>
            {name.toUpperCase()}
          </div>
          {phase === 'revealing' && (
            <div
              aria-hidden="true"
              className="rg-img-ph rg-reveal-cover"
              onAnimationEnd={() => setPhase('revealed')}
              style={{ position: 'absolute', inset: 0 }}
            />
          )}
        </div>
      )}

      {username && slug && phase === 'revealed' && (
        <Link
          href={`/${encodeURIComponent(username)}/${slug}`}
          className="rg-btn rg-btn-primary"
          style={{ padding: '12px 16px', fontSize: 12 }}
        >
          VER SU LISTA →
        </Link>
      )}
      <p style={{ fontSize: 12, margin: '14px 0 0' }}>
        Esto solo lo ves vos. No se lo digas a nadie.
      </p>
    </div>
  )
}
