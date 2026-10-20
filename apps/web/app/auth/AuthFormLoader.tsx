'use client'

import dynamic from 'next/dynamic'
import TopBar from '@/components/TopBar'

const AuthFormDynamic = dynamic(() => import('./AuthForm'), {
  ssr: false,
  loading: () => <AuthSkeleton />,
})

// Same frame as the real form, so the page doesn't jump when the JS arrives.
function AuthSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <TopBar band />
      <main id="main" aria-busy="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div className="rg-skeleton" style={{ height: 96, marginBottom: 24 }} />
          <div className="rg-skeleton" style={{ height: 320 }} />
          <p role="status" className="rg-mono" style={{ marginTop: 16, textAlign: 'center' }}>CARGANDO…</p>
        </div>
      </main>
    </div>
  )
}

export default function AuthFormLoader({ siteKey }: { siteKey: string }) {
  return <AuthFormDynamic siteKey={siteKey} />
}
