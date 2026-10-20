// Skeleton for the lists overview. Renders inside the dashboard layout, so the top bar is already there.
export default function DashboardLoading() {
  return (
    <div aria-busy="true">
      <p role="status" className="rg-mono" style={{ marginBottom: 20 }}>CARGANDO TUS LISTAS…</p>
      <div className="rg-skeleton" style={{ width: '60%', height: 64, marginBottom: 28 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="rg-skeleton" style={{ height: 140 }} />
        ))}
      </div>
    </div>
  )
}
