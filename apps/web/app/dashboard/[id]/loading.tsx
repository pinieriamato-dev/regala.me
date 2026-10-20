// Skeleton for one list in the dashboard: header, share card, privacy row, add-item block and item rows.
export default function ListDetailLoading() {
  return (
    <div aria-busy="true" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="rg-mono" style={{ marginBottom: 20, color: 'var(--ink-muted)' }}>← MIS LISTAS</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div className="rg-skeleton" style={{ width: 52, height: 52 }} />
        <div>
          <p role="status" className="rg-mono" style={{ marginBottom: 8 }}>CARGANDO LA LISTA…</p>
          <div className="rg-skeleton" style={{ width: 240, maxWidth: '60vw', height: 48 }} />
        </div>
      </div>
      <div style={{ background: 'var(--ink)', height: 96, marginBottom: 24, border: '2px solid var(--ink)' }} />
      <div className="rg-skeleton" style={{ height: 64, marginBottom: 24 }} />
      <div className="rg-skeleton" style={{ height: 116, marginBottom: 24 }} />
      {[1, 2, 3].map(i => (
        <div key={i} className="rg-skeleton" style={{ display: 'flex', gap: 14, padding: 14, marginBottom: 12 }}>
          <div style={{ width: 64, height: 64, flexShrink: 0, border: '2px solid var(--ink)', background: 'var(--paper)' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
            <div style={{ width: '60%', height: 14, background: 'rgba(15,15,15,0.12)' }} />
            <div style={{ width: '30%', height: 10, background: 'rgba(15,15,15,0.08)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
