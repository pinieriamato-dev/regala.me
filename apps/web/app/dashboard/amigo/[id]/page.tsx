import { createServerSupabase } from '@/lib/supabase/server'
import { decodeParam } from '@/lib/params'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import DrawButton from './DrawButton'

type Member = { display_name: string; has_list: boolean }
type Assignment = { display_name: string; username: string | null; slug: string | null } | null
type GroupView = {
  id: string
  name: string
  invite_code: string
  drawn: boolean
  is_owner: boolean
  is_member: boolean
  members: Member[]
  assignment: Assignment
}

type Props = { params: Promise<{ id: string }> }

export default async function AmigoGroupPage({ params }: Props) {
  const { id } = await params
  const groupId = decodeParam(id)

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data, error } = await supabase.rpc('sa_get_group', { p_group_id: groupId })
  if (error || !data) redirect('/dashboard/amigo')
  const group = data as GroupView

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://regala.me'
  const inviteUrl = `${siteUrl}/unirse/${group.invite_code}`
  const count = group.members.length
  const assignment = group.assignment

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/dashboard/amigo" className="rg-mono" style={{ color: 'rgba(15,15,15,0.5)', textDecoration: 'none', fontSize: 10 }}>
          ← AMIGO INVISIBLE
        </Link>
      </div>

      <h1 className="rg-display" style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', marginBottom: 24 }}>
        {group.name.toUpperCase()}
      </h1>

      {/* Result for the caller: who they gift to */}
      {group.drawn && assignment && (
        <div className="rg-card-yellow" style={{ padding: 24, marginBottom: 24 }}>
          <div className="rg-mono" style={{ fontSize: 9, marginBottom: 8 }}>LE REGALÁS A</div>
          <div className="rg-display" style={{ fontSize: 40, lineHeight: 1, marginBottom: 16 }}>
            {assignment.display_name.toUpperCase()}
          </div>
          {assignment.username && assignment.slug && (
            <Link
              href={`/${encodeURIComponent(assignment.username)}/${assignment.slug}`}
              className="rg-btn rg-btn-primary"
              style={{ padding: '12px 16px', fontSize: 12 }}
            >
              VER SU LISTA →
            </Link>
          )}
          <p style={{ fontSize: 12, margin: '14px 0 0' }}>
            Esto solo lo ves vos. No se lo digas a nadie.
          </p>
        </div>
      )}

      {group.drawn && !group.is_member && !group.is_owner && (
        <div className="rg-card" style={{ padding: 20, marginBottom: 24 }}>
          Este grupo ya se sorteó.
        </div>
      )}

      {/* Invite */}
      {!group.drawn && (
        <div className="rg-card" style={{ padding: 20, marginBottom: 24 }}>
          <div className="rg-mono" style={{ fontSize: 9, marginBottom: 8, color: 'rgba(15,15,15,0.6)' }}>LINK DE INVITACIÓN</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, wordBreak: 'break-all', marginBottom: 14 }}>{inviteUrl}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`¡Armemos el amigo invisible! Entrá acá y creá tu lista: ${inviteUrl}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="rg-btn"
              style={{ padding: '10px 14px', fontSize: 11, background: '#25D366', color: 'var(--ink)', border: '2px solid var(--ink)', boxShadow: 'var(--shadow-sm)' }}
            >
              COMPARTIR POR WHATSAPP
            </a>
            {!group.is_member && (
              <Link href={`/unirse/${group.invite_code}`} className="rg-btn rg-btn-ghost" style={{ padding: '10px 14px', fontSize: 11 }}>
                PARTICIPAR
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Participants */}
      <div className="rg-card" style={{ padding: 20, marginBottom: 24 }}>
        <div className="rg-mono" style={{ fontSize: 9, marginBottom: 12, color: 'rgba(15,15,15,0.6)' }}>
          PARTICIPANTES ({count})
        </div>
        {count === 0 ? (
          <p style={{ fontSize: 13, margin: 0 }}>Todavía nadie entró.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {group.members.map((m, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14, fontWeight: 700 }}>
                <span>{m.display_name}</span>
                {!m.has_list && <span className="rg-mono" style={{ fontSize: 9, color: 'rgba(15,15,15,0.5)' }}>SIN LISTA</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Draw: organizer only, before the draw */}
      {group.is_owner && !group.drawn && (
        <div className="rg-card" style={{ padding: 20 }}>
          <div className="rg-mono" style={{ fontSize: 9, marginBottom: 12, color: 'rgba(15,15,15,0.6)' }}>
            SORTEO · NO SE PUEDE DESHACER
          </div>
          <DrawButton groupId={group.id} canDraw={count >= 3} participants={count} />
        </div>
      )}
    </div>
  )
}
