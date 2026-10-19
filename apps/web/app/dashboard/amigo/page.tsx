import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type GroupRow = { id: string; name: string; drawn: boolean; is_owner: boolean }

export default async function AmigoListPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data, error } = await supabase.rpc('sa_list_my_groups')
  const groups = (data ?? []) as GroupRow[]

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 32 }}>
        <div>
          <div className="rg-mono" style={{ marginBottom: 4 }}>Amigo invisible</div>
          <h1 className="rg-display" style={{ fontSize: 'clamp(3rem, 6vw, 5rem)' }}>
            TUS <span className="rg-em">GRUPOS.</span>
          </h1>
        </div>
        <Link href="/dashboard/amigo/new" className="rg-btn rg-btn-primary">
          + NUEVO GRUPO
        </Link>
      </div>

      {error && (
        <p style={{ color: 'var(--red)', fontWeight: 700, fontSize: 13, marginBottom: 16 }}>
          No pudimos cargar los grupos. Intentá de nuevo en un rato.
        </p>
      )}

      {!error && groups.length === 0 ? (
        <div style={{ padding: '60px 32px', textAlign: 'center', border: '2px dashed var(--ink)', background: 'var(--paper)' }}>
          <div className="rg-display" style={{ fontSize: 80, lineHeight: 1, marginBottom: 14 }}>🎅</div>
          <h2 className="rg-display" style={{ fontSize: 36, marginBottom: 8 }}>
            ARMÁ EL <span className="rg-em">SORTEO.</span>
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.65)', margin: '0 auto 24px', maxWidth: 320 }}>
            Creás un grupo, mandás el link y cada uno arma su lista. Después sorteás.
          </p>
          <Link href="/dashboard/amigo/new" className="rg-btn rg-btn-primary">CREAR GRUPO →</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {groups.map(group => (
            <Link key={group.id} href={`/dashboard/amigo/${group.id}`} className="rg-card" style={{ padding: 20, textDecoration: 'none', color: 'inherit' }}>
              <div className="rg-mono" style={{ fontSize: 9, marginBottom: 8, color: 'rgba(15,15,15,0.5)' }}>
                {group.is_owner ? 'ORGANIZÁS' : 'PARTICIPÁS'} · {group.drawn ? 'SORTEADO' : 'SIN SORTEAR'}
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>{group.name}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
