import { createServerSupabase } from '@/lib/supabase/server'
import { signOut } from '@/app/auth/actions'
import Logomark from '@/components/Logomark'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'vos'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <header style={{
        background: 'var(--paper)',
        borderBottom: '2px solid var(--ink)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logomark size={20} href="/dashboard" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(15,15,15,0.5)' }}>
              {displayName.toUpperCase()}
            </span>
            <form action={signOut}>
              <button type="submit" style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 0.5,
                color: 'rgba(15,15,15,0.5)',
              }}>
                SALIR
              </button>
            </form>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {children}
      </main>
    </div>
  )
}
