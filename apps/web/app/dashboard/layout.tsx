import { createServerSupabase } from '@/lib/supabase/server'
import { signOut } from '@/app/auth/actions'
import Logomark from '@/components/Logomark'
import Link from 'next/link'

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
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Logomark size={20} href="/dashboard" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap' }}>
            <Link href="/dashboard" className="rg-nav hidden sm:inline-flex">
              MIS LISTAS
            </Link>
            <Link href="/dashboard/new" className="rg-nav hidden sm:inline-flex">
              + NUEVA
            </Link>
            <Link href="/dashboard/amigos" className="rg-nav">
              AMIGOS
            </Link>
            <Link href="/dashboard/profile" className="rg-nav">
              MI PERFIL
            </Link>
            {/* On phones the logo links home and the dashboard has its own + NUEVA LISTA */}
            <span className="hidden sm:inline-block" style={{ width: 1, height: 14, background: 'rgba(15,15,15,0.15)' }} />
            <span className="hidden sm:inline" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-muted)' }}>
              {displayName.toUpperCase()}
            </span>
            <form action={signOut}>
              <button type="submit" className="rg-nav">
                SALIR
              </button>
            </form>
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }}>
        {children}
      </main>
    </div>
  )
}
