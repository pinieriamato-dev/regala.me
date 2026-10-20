// Skeleton for the lists overview: page header with actions, then the grid of list cards.
export default function DashboardLoading() {
  return (
    <div aria-busy="true">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 32 }}>
        <div>
          <p role="status" className="rg-mono" style={{ marginBottom: 8 }}>CARGANDO TUS LISTAS…</p>
          <div className="rg-skeleton" style={{ width: 280, maxWidth: '70vw', height: 72 }} />
        </div>
        <div className="rg-skeleton" style={{ width: 150, height: 44 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="rg-skeleton" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, border: '2px solid var(--ink)', background: 'var(--paper)' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ width: '70%', height: 16, background: 'rgba(15,15,15,0.12)' }} />
                <div style={{ width: '40%', height: 10, background: 'rgba(15,15,15,0.08)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, height: 36, border: '2px solid var(--ink)', background: 'var(--paper)' }} />
              <div style={{ flex: 1, height: 36, border: '2px solid var(--ink)', background: 'var(--paper)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
