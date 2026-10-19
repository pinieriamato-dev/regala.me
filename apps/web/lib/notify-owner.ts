import { createClient } from '@supabase/supabase-js'

type ClaimNotice = {
  listId: string
  itemTitle: string
  claimerName: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://regala.me'
const FROM = 'regala.me <avisos@app.regala.me>'

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => HTML_ESCAPES[c])

// Emails the list owner when a gifter claims an item. Surprise lists are skipped: the owner must not learn who claimed.
// Best-effort: it does nothing until RESEND_API_KEY and SUPABASE_SERVICE_ROLE_KEY are set, and it never throws,
// so a failed email can't fail the claim.
export async function notifyOwnerOfClaim(notice: ClaimNotice): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!resendKey || !serviceKey) return

  try {
    // The list's owner and the owner's email live behind RLS / auth.users, so only the service role reads them here.
    const admin = createClient(process.env.SUPABASE_URL!, serviceKey, { auth: { persistSession: false } })
    const { data: list } = await admin
      .from('wishlists')
      .select('title, owner_id, is_surprise')
      .eq('id', notice.listId)
      .single()
    if (!list || list.is_surprise) return

    const { data } = await admin.auth.admin.getUserById(list.owner_id)
    const to = data.user?.email
    if (!to) return

    const claimer = escapeHtml(notice.claimerName)
    const item = escapeHtml(notice.itemTitle)
    const listTitle = escapeHtml(list.title)
    const link = `${SITE_URL}/dashboard/${notice.listId}`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: `${notice.claimerName} reclamó un regalo de tu lista`,
        html: [
          `<p>Hola! <strong>${claimer}</strong> reclamó <strong>${item}</strong> de tu lista <strong>${listTitle}</strong>.</p>`,
          `<p>Ya no aparece disponible para otros invitados. Si te equivocaste, podés liberarlo desde la lista.</p>`,
          `<p><a href="${link}">Ver mi lista</a></p>`,
        ].join(''),
      }),
    })
    if (!res.ok) console.error('Owner claim notice: Resend responded', res.status)
  } catch (err) {
    console.error('Owner claim notice failed', err)
  }
}
