import TopBar from '@/components/TopBar'

// Skeleton in the shape of a gifter list: header, then item cards.
export default function GifterLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <TopBar band />
      <main id="main" aria-busy="true" style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px' }}>
        <p role="status" className="rg-mono" style={{ marginBottom: 20 }}>CARGANDO LA LISTA…</p>
        <div className="rg-skeleton" style={{ width: '70%', height: 48, marginBottom: 16 }} />
        <div className="rg-skeleton" style={{ width: '40%', height: 20, marginBottom: 32 }} />
        {[1, 2, 3].map(i => (
          <div key={i} className="rg-skeleton" style={{ height: 88, marginBottom: 14 }} />
        ))}
      </main>
    </div>
  )
}
