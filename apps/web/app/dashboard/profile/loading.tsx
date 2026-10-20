// Skeleton for the profile form: avatar block, then the field stack and the save button.
export default function ProfileLoading() {
  return (
    <div aria-busy="true" style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="rg-mono" style={{ marginBottom: 20, color: 'var(--ink-muted)' }}>← MIS LISTAS</div>
      <p role="status" className="rg-mono" style={{ marginBottom: 8 }}>CARGANDO TU PERFIL…</p>
      <div className="rg-skeleton" style={{ width: 240, maxWidth: '70vw', height: 64, marginBottom: 28 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <div className="rg-skeleton" style={{ width: 80, height: 80, flexShrink: 0 }} />
        <div className="rg-skeleton" style={{ width: 150, height: 40 }} />
      </div>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ marginBottom: 18 }}>
          <div style={{ width: 120, height: 10, background: 'rgba(15,15,15,0.12)', marginBottom: 8 }} />
          <div className="rg-skeleton" style={{ height: 44 }} />
        </div>
      ))}
      <div className="rg-skeleton" style={{ height: 50, marginTop: 8 }} />
    </div>
  )
}
