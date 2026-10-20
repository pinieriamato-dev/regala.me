import TopBar from '@/components/TopBar'

// Skeleton for a public profile: avatar and name, bio line, then the list cards.
export default function ProfileLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <TopBar band />
      <main id="main" aria-busy="true" style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
          <div className="rg-skeleton" style={{ width: 80, height: 80, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p role="status" className="rg-mono" style={{ marginBottom: 8 }}>CARGANDO EL PERFIL…</p>
            <div className="rg-skeleton" style={{ width: '70%', height: 40 }} />
          </div>
        </div>
        <div style={{ width: '60%', height: 12, background: 'rgba(15,15,15,0.08)', marginBottom: 28 }} />
        {[1, 2, 3].map(i => (
          <div key={i} className="rg-skeleton" style={{ height: 76, marginBottom: 12 }} />
        ))}
      </main>
    </div>
  )
}
