import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MergeForm from './MergeForm'

export default async function MergePage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: lists } = await supabase
    .from('wishlists')
    .select('id, title, occasion, items(id)')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (!lists || lists.length < 2) redirect('/dashboard')

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/dashboard" className="rg-mono" style={{ color: 'rgba(15,15,15,0.5)', textDecoration: 'none', fontSize: 10 }}>
          ← MIS LISTAS
        </Link>
      </div>
      <h1 className="rg-display" style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', marginBottom: 24 }}>
        COMBINAR <span className="rg-em">LISTAS.</span>
      </h1>
      <MergeForm lists={lists as Parameters<typeof MergeForm>[0]['lists']} />
    </div>
  )
}
