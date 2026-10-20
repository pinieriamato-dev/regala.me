'use client'

// Replaces the root layout when it crashes, so it must render its own <html> and <body>.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: '#F2F0E6', color: '#0F0F0F', fontFamily: 'system-ui, sans-serif' }}>
        <main id="main" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Impact, sans-serif', textTransform: 'uppercase', fontSize: 48, lineHeight: 0.9, margin: 0 }}>
            ALGO SALIÓ MAL.
          </h1>
          <p style={{ margin: 0 }}>Recargá la página o probá de nuevo.</p>
          <button type="button" onClick={reset} style={{ padding: '14px 24px', background: '#F5E13E', color: '#0F0F0F', border: '2px solid #0F0F0F', boxShadow: '3px 3px 0 0 #0F0F0F', fontWeight: 700, cursor: 'pointer' }}>
            PROBAR DE NUEVO
          </button>
        </main>
      </body>
    </html>
  )
}
