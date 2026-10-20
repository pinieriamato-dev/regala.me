import Link from 'next/link'
import TopBar from '@/components/TopBar'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <TopBar band />
      <main id="main" className="rg-system">
        <p className="rg-mono">Error 404</p>
        <h1 className="rg-display" style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)' }}>
          ESTA PÁGINA <span className="rg-em">NO EXISTE.</span>
        </h1>
        <p style={{ fontSize: 14, maxWidth: '40ch', margin: 0 }}>
          Puede que el link esté mal copiado o que la lista sea privada. Pedile el link de nuevo a quien te lo pasó.
        </p>
        <Link href="/" className="rg-btn rg-btn-primary" style={{ padding: '14px 24px', fontSize: 13 }}>
          IR AL INICIO →
        </Link>
      </main>
    </div>
  )
}
