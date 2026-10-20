// Skeleton for friends: header, then the same sections the page shows (lists, search, friends).
const bar = (w: number | string, h: number, soft = false) => (
  <div style={{ width: w, height: h, background: soft ? 'rgba(15,15,15,0.08)' : 'rgba(15,15,15,0.12)' }} />
)

export default function FriendsLoading() {
  return (
    <div aria-busy="true">
      <div style={{ marginBottom: 32 }}>
        <p role="status" className="rg-mono" style={{ marginBottom: 8 }}>CARGANDO AMIGOS…</p>
        <div className="rg-skeleton" style={{ width: 260, maxWidth: '70vw', height: 80 }} />
      </div>

      {[1, 2].map(section => (
        <section key={section} style={{ marginBottom: 40 }}>
          <div style={{ marginBottom: 12 }}>{bar(180, 10)}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {[1, 2].map(i => (
              <div key={i} className="rg-skeleton" style={{ height: 88 }} />
            ))}
          </div>
        </section>
      ))}

      <section style={{ marginBottom: 40 }}>
        <div style={{ marginBottom: 12 }}>{bar(140, 10)}</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div className="rg-skeleton" style={{ flex: '1 1 240px', height: 44 }} />
          <div className="rg-skeleton" style={{ width: 120, height: 44 }} />
        </div>
      </section>

      <section style={{ marginBottom: 40 }}>
        <div style={{ marginBottom: 12 }}>{bar(160, 10)}</div>
        {[1, 2, 3].map(i => (
          <div key={i} className="rg-skeleton" style={{ height: 60, marginBottom: 10 }} />
        ))}
      </section>
    </div>
  )
}
