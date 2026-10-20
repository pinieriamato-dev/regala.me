'use client'

import Link from 'next/link'
import TopBar from '@/components/TopBar'

export default function GifterError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <TopBar band />
      <main id="main" className="rg-system">
        <h1 className="rg-display" style={{ fontSize: 48 }}>ALGO SALIÓ MAL.</h1>
        <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.6)', margin: 0 }}>No pudimos cargar esta lista. Intentá de nuevo.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" onClick={reset} className="rg-btn rg-btn-primary" style={{ padding: '12px 24px', fontSize: 13 }}>
            PROBAR DE NUEVO
          </button>
          <Link href="/" className="rg-btn rg-btn-ghost" style={{ padding: '12px 24px', fontSize: 13 }}>
            IR AL INICIO →
          </Link>
        </div>
      </main>
    </div>
  )
}
