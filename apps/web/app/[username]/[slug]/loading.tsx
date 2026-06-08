export default function GifterLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ height: 4, background: 'var(--ink)' }} />
      <div style={{ padding: '14px 20px', borderBottom: '2px solid var(--ink)', background: 'var(--paper)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: -0.5 }}>
          regala<span style={{ color: 'var(--red)' }}>.</span>me
        </div>
      </div>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px' }}>
        <div style={{ width: '60%', height: 48, background: 'rgba(15,15,15,0.08)', marginBottom: 16 }} />
        <div style={{ width: '40%', height: 20, background: 'rgba(15,15,15,0.06)', marginBottom: 32 }} />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 80, background: 'var(--paper)', border: '2px solid var(--ink)', marginBottom: 12 }} />
        ))}
      </div>
    </div>
  )
}
