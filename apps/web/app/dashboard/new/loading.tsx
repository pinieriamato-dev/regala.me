// Skeleton for the new-list form: title, then the field stack and the submit button.
export default function NewListLoading() {
  return (
    <div aria-busy="true" style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="rg-mono" style={{ marginBottom: 20, color: 'var(--ink-muted)' }}>← MIS LISTAS</div>
      <p role="status" className="rg-mono" style={{ marginBottom: 8 }}>CARGANDO…</p>
      <div className="rg-skeleton" style={{ width: 280, maxWidth: '75vw', height: 72, marginBottom: 28 }} />
      {[1, 2, 3].map(i => (
        <div key={i} style={{ marginBottom: 18 }}>
          <div style={{ width: 110, height: 10, background: 'rgba(15,15,15,0.12)', marginBottom: 8 }} />
          <div className="rg-skeleton" style={{ height: 44 }} />
        </div>
      ))}
      <div className="rg-skeleton" style={{ height: 50, marginTop: 8 }} />
    </div>
  )
}
