'use client'

export default function GifterError() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: -0.5, marginBottom: 32 }}>
        regala<span style={{ color: 'var(--red)' }}>.</span>me
      </div>
      <h1 className="rg-display" style={{ fontSize: 48, marginBottom: 12 }}>ALGO SALIÓ MAL.</h1>
      <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.6)', marginBottom: 24 }}>No pudimos cargar esta lista. Intentá de nuevo.</p>
      <a href="/" className="rg-btn rg-btn-primary" style={{ padding: '12px 24px', fontSize: 13 }}>
        IR AL INICIO →
      </a>
    </div>
  )
}
