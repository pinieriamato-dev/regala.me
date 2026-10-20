// Skeleton for a single list in the dashboard. Renders inside the dashboard layout.
export default function ListDetailLoading() {
  return (
    <div aria-busy="true">
      <p role="status" className="rg-mono" style={{ marginBottom: 20 }}>CARGANDO LA LISTA…</p>
      <div className="rg-skeleton" style={{ width: '55%', height: 56, marginBottom: 24 }} />
      <div className="rg-skeleton" style={{ height: 120, marginBottom: 20 }} />
      {[1, 2, 3].map(i => (
        <div key={i} className="rg-skeleton" style={{ height: 96, marginBottom: 14 }} />
      ))}
    </div>
  )
}
