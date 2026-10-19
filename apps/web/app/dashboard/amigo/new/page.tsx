import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NewGroupForm from './NewGroupForm'

export default async function NewAmigoGroupPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/dashboard/amigo" className="rg-mono" style={{ color: 'rgba(15,15,15,0.5)', textDecoration: 'none', fontSize: 10 }}>
          ← AMIGO INVISIBLE
        </Link>
      </div>
      <h1 className="rg-display" style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', marginBottom: 24 }}>
        NUEVO <span className="rg-em">GRUPO.</span>
      </h1>
      <NewGroupForm />
    </div>
  )
}
