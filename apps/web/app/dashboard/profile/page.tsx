import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProfileForm from './profile-form'

export default async function ProfilePage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, bio, birthday, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/dashboard" className="rg-mono" style={{ color: 'rgba(15,15,15,0.5)', textDecoration: 'none', fontSize: 10 }}>
          ← MIS LISTAS
        </Link>
      </div>
      <h1 className="rg-display" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', marginBottom: 28 }}>
        MI <span className="rg-em">PERFIL.</span>
      </h1>
      <ProfileForm profile={profile} />
    </div>
  )
}
