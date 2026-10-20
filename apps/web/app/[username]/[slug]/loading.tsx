import TopBar from '@/components/TopBar'

// Skeleton for a gifter list: header with the occasion emoji, then item rows with an image box and a claim button.
export default function GifterLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <TopBar band />
      <main id="main" aria-busy="true" style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          <div className="rg-skeleton" style={{ width: 56, height: 56 }} />
          <div>
            <p role="status" className="rg-mono" style={{ marginBottom: 8 }}>CARGANDO LA LISTA…</p>
            <div className="rg-skeleton" style={{ width: 220, maxWidth: '60vw', height: 44 }} />
          </div>
        </div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rg-skeleton" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 16, marginBottom: 14 }}>
            <div style={{ width: 80, height: 80, flexShrink: 0, border: '2px solid var(--ink)', background: 'var(--paper)' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ width: '65%', height: 14, background: 'rgba(15,15,15,0.12)' }} />
              <div style={{ width: '35%', height: 10, background: 'rgba(15,15,15,0.08)' }} />
            </div>
            <div style={{ width: 92, height: 40, flexShrink: 0, border: '2px solid var(--ink)', background: 'var(--yellow)' }} />
          </div>
        ))}
      </main>
    </div>
  )
}
