import { createServerSupabase } from '@/lib/supabase/server'
import { decodeParam } from '@/lib/params'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import TopBar from '@/components/TopBar'
import JoinForm from './JoinForm'

// Invite page for the amigo invisible draw. Reads the code per request, never prerendered.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ code: string }> }

type Preview = { id: string; name: string; drawn: boolean; member_count: number; is_member: boolean }

export default async function JoinAmigoPage({ params }: Props) {
  const { code: rawCode } = await params
  const code = decodeParam(rawCode)

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <TopBar band />
      <main id="main" style={{ maxWidth: 480, margin: '0 auto', padding: '48px 16px' }}>
        <div className="rg-mono" style={{ marginBottom: 8 }}>Amigo invisible</div>
        {children}
      </main>
    </div>
  )

  if (!user) {
    return shell(
      <>
        <h1 className="rg-display" style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', marginBottom: 20 }}>
          TE INVITARON <span className="rg-em">AL SORTEO.</span>
        </h1>
        <div className="rg-card" style={{ padding: 24 }}>
          <p style={{ fontSize: 14, marginTop: 0 }}>Para entrar necesitás una cuenta en regala.me. Creala o iniciá sesión y volvé a abrir este link.</p>
          <Link href="/auth" className="rg-btn rg-btn-primary" style={{ width: '100%', padding: '14px', fontSize: 13, justifyContent: 'center' }}>
            ENTRAR O CREAR CUENTA →
          </Link>
        </div>
      </>
    )
  }

  const { data, error } = await supabase.rpc('sa_preview_invite', { p_invite_code: code })
  if (error || !data) {
    return shell(
      <>
        <h1 className="rg-display" style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', marginBottom: 20 }}>
          NO ENCONTRAMOS <span className="rg-em">EL GRUPO.</span>
        </h1>
        <p style={{ fontSize: 14 }}>Revisá el link que te pasaron.</p>
      </>
    )
  }

  const preview = data as Preview
  if (preview.is_member) redirect(`/dashboard/amigo/${preview.id}`)

  if (preview.drawn) {
    return shell(
      <>
        <h1 className="rg-display" style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', marginBottom: 20 }}>
          YA SE <span className="rg-em">SORTEÓ.</span>
        </h1>
        <p style={{ fontSize: 14 }}>Este grupo ya tiene sorteo hecho, no se puede entrar.</p>
      </>
    )
  }

  const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
  const defaultName = profile?.display_name ?? user.email?.split('@')[0] ?? ''

  return shell(
    <>
      <h1 className="rg-display" style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', marginBottom: 12 }}>
        {preview.name.toUpperCase()}
      </h1>
      <p className="rg-mono" style={{ fontSize: 10, marginBottom: 24, color: 'var(--ink-muted)' }}>
        {preview.member_count} {preview.member_count === 1 ? 'PARTICIPANTE' : 'PARTICIPANTES'} HASTA AHORA
      </p>
      <JoinForm code={code} defaultName={defaultName} />
    </>
  )
}
