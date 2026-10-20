'use client'

import Link from 'next/link'
import TopBar from '@/components/TopBar'

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <TopBar band />
      <main id="main" className="rg-system">
        <p className="rg-mono">Error</p>
        <h1 className="rg-display" style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)' }}>
          ALGO SALIÓ <span className="rg-em">MAL.</span>
        </h1>
        <p style={{ fontSize: 14, maxWidth: '40ch', margin: 0 }}>No pudimos cargar la página. Probá de nuevo en un momento.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" onClick={reset} className="rg-btn rg-btn-primary" style={{ padding: '14px 24px', fontSize: 13 }}>
            PROBAR DE NUEVO
          </button>
          <Link href="/" className="rg-btn rg-btn-ghost" style={{ padding: '14px 24px', fontSize: 13 }}>
            IR AL INICIO →
          </Link>
        </div>
      </main>
    </div>
  )
}
