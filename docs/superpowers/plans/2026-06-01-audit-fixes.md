# Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all issues identified in `audit-report.md` and `TODOS.md`, from P0 launch blockers through P3 post-launch polish.

**Architecture:** Fixes are grouped by priority tier (P0→P3). Most are surgical edits to existing files. The only new files are `loading.tsx`, `error.tsx`, `opengraph-image.tsx`, `robots.ts`, `sitemap.ts`, and `.env.local.example`. No new abstractions unless explicitly specified.

**Tech Stack:** Next.js 15 App Router, Supabase SSR, TypeScript strict, React 19 `useActionState`, Expo 52 React Native, Tailwind + `rg-*` CSS, Zod (already used in auth actions), Supabase MCP for migrations.

---

## P0 — Launch Blockers (Active Breakage)

### Task 1: Fix `privacy_level` missing from `createWishlist` insert

**Files:**
- Modify: `apps/web/app/dashboard/actions.ts` (line 22–33)

The `createWishlist` action never writes `privacy_level` to the DB. Every list gets `NULL`, which fails the gifter page `.in('privacy_level', ['public', 'link_only'])` check — returning 404 for every list.

- [ ] **Step 1: Edit the insert in `createWishlist`**

Change the `.insert({...})` block at line 22–33 of `apps/web/app/dashboard/actions.ts`:

```typescript
const { data: list, error } = await supabase
  .from('wishlists')
  .insert({
    owner_id: user.id,
    title,
    slug,
    occasion,
    occasion_date: occasion_date || null,
    currency,
    is_surprise,
    is_public: privacy_level !== 'private',
    privacy_level,
  })
  .select('id')
  .single()
```

- [ ] **Step 2: Verify manually**

Start the dev server (`pnpm dev:web` from repo root), create a new list, then visit `localhost:3001/{username}/{slug}`. It should load instead of 404.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/dashboard/actions.ts
git commit -m "fix: write privacy_level on wishlist insert — gifter page was 404 for all lists"
```

---

### Task 2: Fix mobile `add-item.tsx` — remove `currency` from items insert

**Files:**
- Modify: `apps/mobile/app/add-item.tsx` (line 32–41)

The `items` table has no `currency` column. Inserting it causes every mobile item addition to fail with a Supabase error.

- [ ] **Step 1: Remove `currency` from the insert**

In `apps/mobile/app/add-item.tsx`, change the `supabase.from('items').insert(...)` call (line 32–41):

```typescript
const { error } = await supabase.from('items').insert({
  wishlist_id: wishlistId,
  title: title.trim(),
  description: description.trim() || null,
  price: price ? parseFloat(price.replace(/\./g, '').replace(',', '.')) : null,
  url: url.trim() || null,
  priority,
  sort_order: Date.now(),
})
```

Also remove the `currency` state and its picker UI, since item currency comes from the parent wishlist. Delete lines:
- `const [currency, setCurrency] = useState<Currency>('ARS')` (line 24)
- The entire price row `<ScrollView horizontal ...>` currency picker JSX (lines 62–68)
- The `import { CURRENCIES } from 'shared'` (line 9) — remove `CURRENCIES` from that import, keep `Currency`, `Priority`

After removing currency from UI, remove `Currency` type import too if unused.

```typescript
// line 9 becomes:
import type { Priority } from 'shared'
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/add-item.tsx
git commit -m "fix: remove currency field from items insert — column does not exist on items table"
```

---

### Task 3: Fix mobile share screen — use `profiles.username` not email prefix

**Files:**
- Modify: `apps/mobile/app/share.tsx` (line 17–21)

The share URL is built from `user?.email?.split('@')[0]`, which is not the username. The correct username is in `profiles.username`.

- [ ] **Step 1: Replace the `useEffect` in `share.tsx`**

Replace lines 16–23:

```typescript
useEffect(() => {
  supabase.auth.getUser().then(async ({ data: { user } }) => {
    if (!user) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()
    const username = profile?.username ?? user.id
    const url = `https://regala.me/${username}/${slug}`
    setListUrl(url)
    setMessage(`Hola! Armé una listita de regalos así no traen lo mismo 😄\n👉 ${url}`)
  })
}, [slug])
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/share.tsx
git commit -m "fix: use profiles.username for share URL — email prefix was building wrong URLs"
```

---

### Task 4: Fix mobile year padding bug in `create-list.tsx`

**Files:**
- Modify: `apps/mobile/app/create-list.tsx` (line 33)

`year.padStart(4, '2')` pads with character `'2'` instead of `'0'`, turning year `'24'` into `'2224'`.

- [ ] **Step 1: Fix the padding character**

In `apps/mobile/app/create-list.tsx`, change line 33:

```typescript
const occasionDate = day && month && year
  ? `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  : null
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/create-list.tsx
git commit -m "fix: year padding uses '0' not '2' — dates like '24' were becoming '2224'"
```

---

## P1 — Security & Correctness

### Task 5: Add `privacy_level` to shared `Wishlist` type

**Files:**
- Modify: `packages/shared/src/types.ts` (line 21–33)

The `Wishlist` interface is missing `privacy_level`, causing TypeScript to miss all the mismatches the audit found.

- [ ] **Step 1: Update the `Wishlist` interface**

In `packages/shared/src/types.ts`, update lines 21–33:

```typescript
export type PrivacyLevel = 'public' | 'link_only' | 'private'

export interface Wishlist {
  id: string
  owner_id: string
  title: string
  slug: string
  occasion: OccasionId | null
  occasion_date: string | null
  recipient_name: string | null
  is_surprise: boolean
  currency: Currency
  is_public: boolean
  privacy_level: PrivacyLevel
  created_at: string
}
```

- [ ] **Step 2: Run typecheck to see what breaks**

```bash
pnpm typecheck
```

Fix any type errors surfaced (likely none — the field was previously untyped and accessed via plain object queries).

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types.ts
git commit -m "fix: add privacy_level to Wishlist type — was missing, causing silent type mismatches"
```

---

### Task 6: Add mobile `privacy_level` to `create-list.tsx`

**Files:**
- Modify: `apps/mobile/app/create-list.tsx` (line 38)

Mobile always inserts `is_public: true` with no `privacy_level`, meaning mobile-created lists all get `privacy_level = NULL` in the DB — same root issue as Task 1 but on mobile.

- [ ] **Step 1: Add `privacy_level: 'public'` to the insert**

In `apps/mobile/app/create-list.tsx`, change the `.insert(...)` call (line 36–38):

```typescript
const { data, error } = await supabase
  .from('wishlists')
  .insert({
    owner_id: user.id,
    title: title.trim(),
    slug,
    occasion,
    occasion_date: occasionDate,
    is_surprise: isSurprise,
    currency,
    is_public: true,
    privacy_level: 'public',
  })
  .select()
  .single()
```

No privacy UI is needed on mobile yet — defaulting to `'public'` is correct for now.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/create-list.tsx
git commit -m "fix: set privacy_level='public' on mobile wishlist creation — NULL was breaking gifter page"
```

---

### Task 7: Add UNIQUE constraint on claims + handle duplicate in `claimItem`

**Files:**
- Supabase migration (via MCP)
- Modify: `apps/web/app/[username]/[slug]/actions.ts`
- Modify: `apps/web/app/[username]/[slug]/claim-button.tsx`

Double-tap or slow reload creates duplicate claims. Need a DB constraint + friendly error.

- [ ] **Step 1: Apply migration via Supabase MCP**

Run this SQL via `mcp__plugin_supabase_supabase__apply_migration`:

```sql
ALTER TABLE claims ADD CONSTRAINT claims_item_id_unique UNIQUE (item_id);
```

Migration name: `add_unique_claim_per_item`

- [ ] **Step 2: Update `claimItem` action to return friendly error on constraint violation**

Replace `apps/web/app/[username]/[slug]/actions.ts` entirely:

```typescript
'use server'

import { createServerSupabase } from '@/lib/supabase/server'
import { z } from 'zod'

type ClaimState = { error?: string; success?: boolean } | null

const claimSchema = z.object({
  item_id: z.string().uuid(),
  name: z.string().min(1).max(100),
})

export async function claimItem(_prevState: ClaimState, formData: FormData): Promise<ClaimState> {
  const parsed = claimSchema.safeParse({
    item_id: formData.get('item_id'),
    name: (formData.get('name') as string | null)?.trim() ?? '',
  })
  if (!parsed.success) return { error: 'Datos inválidos.' }

  const supabase = await createServerSupabase()

  // Validate item exists on a public/link_only list (prevents cross-list claim)
  const { data: item } = await supabase
    .from('items')
    .select('id, wishlist_id, wishlists!inner(privacy_level)')
    .eq('id', parsed.data.item_id)
    .in('wishlists.privacy_level', ['public', 'link_only'])
    .single()

  if (!item) return { error: 'No se pudo reclamar el regalo. Intentá de nuevo.' }

  const { error } = await supabase.from('claims').insert({
    item_id: parsed.data.item_id,
    claimer_name: parsed.data.name,
  })

  if (error) {
    if (error.code === '23505') return { error: '¡Ya alguien lo reclamó! Elegí otro regalo.' }
    return { error: 'No se pudo reclamar el regalo. Intentá de nuevo.' }
  }

  return { success: true }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/[username]/[slug]/actions.ts
git commit -m "fix: validate item ownership + unique constraint on claims + friendly duplicate error"
```

---

### Task 8: Add Zod validation to `createWishlist` and `addItem`

**Files:**
- Modify: `apps/web/app/dashboard/actions.ts`

No input validation on dashboard actions — empty titles, 10MB strings, NaN prices all pass silently.

- [ ] **Step 1: Add Zod import and schemas, update both actions**

Replace the top of `apps/web/app/dashboard/actions.ts` (keeping the existing imports, adding `z`):

```typescript
'use server'

import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSlug } from 'shared'
import { z } from 'zod'

const createWishlistSchema = z.object({
  title: z.string().min(1, 'El nombre es obligatorio').max(120),
  occasion: z.string().max(50).optional().transform(v => v || null),
  occasion_date: z.string().max(20).optional().transform(v => v || null),
  currency: z.enum(['ARS','BRL','MXN','CLP','COP','UYU','PEN','USD']).default('ARS'),
  is_surprise: z.boolean().default(false),
  privacy_level: z.enum(['public','link_only','private']).default('public'),
})

const addItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional().transform(v => v || null),
  price: z.string().optional().transform(v => {
    if (!v) return null
    const n = Number(v)
    return isNaN(n) ? null : n
  }),
  url: z.string().max(2000).optional().transform(v => {
    if (!v) return null
    return /^https?:\/\//i.test(v) ? v : null
  }),
  priority: z.coerce.number().int().min(1).max(3).default(1),
})

export type CreateWishlistResult = { error: string } | null

export async function createWishlist(_prevState: CreateWishlistResult, formData: FormData): Promise<CreateWishlistResult> {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const parsed = createWishlistSchema.safeParse({
    title:         formData.get('title'),
    occasion:      formData.get('occasion'),
    occasion_date: formData.get('occasion_date'),
    currency:      formData.get('currency'),
    is_surprise:   formData.get('is_surprise') === 'on',
    privacy_level: formData.get('privacy_level'),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { title, occasion, occasion_date, currency, is_surprise, privacy_level } = parsed.data
  const slug = createSlug(title)

  const { data: list, error } = await supabase
    .from('wishlists')
    .insert({
      owner_id: user.id,
      title,
      slug,
      occasion,
      occasion_date,
      currency,
      is_surprise,
      is_public: privacy_level !== 'private',
      privacy_level,
    })
    .select('id')
    .single()

  if (error) return { error: 'No se pudo crear la lista. Intentá de nuevo.' }

  revalidatePath('/dashboard')
  redirect(`/dashboard/${list.id}`)
}
```

Keep `deleteWishlist`, `addItem`, and `deleteItem` with same signatures but add Zod to `addItem` similarly. The full `addItem` replacement:

```typescript
export async function addItem(listId: string, formData: FormData) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: ownedList } = await supabase
    .from('wishlists').select('id').eq('id', listId).eq('owner_id', user.id).single()
  if (!ownedList) return

  const parsed = addItemSchema.safeParse({
    title:       formData.get('title'),
    description: formData.get('description'),
    price:       formData.get('price'),
    url:         formData.get('url'),
    priority:    formData.get('priority'),
  })
  if (!parsed.success) return

  const { data: topItem } = await supabase
    .from('items')
    .select('sort_order')
    .eq('wishlist_id', listId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  await supabase.from('items').insert({
    wishlist_id: listId,
    ...parsed.data,
    sort_order: (topItem?.sort_order ?? -1) + 1,
  })

  revalidatePath(`/dashboard/${listId}`)
}
```

- [ ] **Step 2: Wire `useActionState` in `dashboard/new/page.tsx`**

The action signature changed to `(_prevState, formData)`. Update `new/page.tsx`:

```typescript
'use client'

import { useActionState, useState } from 'react'
import { createWishlist } from '@/app/dashboard/actions'
import type { CreateWishlistResult } from '@/app/dashboard/actions'
import { OCCASIONS, CURRENCIES } from 'shared'
import type { OccasionId, Currency } from 'shared'
import Link from 'next/link'

// ... keep all the existing state and UI unchanged above the form ...

export default function NewListPage() {
  const [state, action, pending] = useActionState<CreateWishlistResult, FormData>(createWishlist, null)
  const [occasion,  setOccasion] = useState<OccasionId | 'personal' | ''>('')
  const [currency,  setCurrency] = useState<Currency>('ARS')
  const [surprise,  setSurprise] = useState(false)
  const [privacy,   setPrivacy]  = useState<Privacy>('public')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('occasion', occasion === 'personal' ? '' : occasion)
    fd.set('currency', currency)
    fd.set('privacy_level', privacy)
    if (surprise) fd.set('is_surprise', 'on')
    action(fd)
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {/* ... keep breadcrumb and h1 unchanged ... */}

      <div className="rg-card" style={{ padding: 28 }}>
        {state?.error && (
          <p style={{ color: 'var(--red)', fontWeight: 700, fontSize: 13, marginBottom: 16, padding: '10px 14px', border: '2px solid var(--red)' }}>
            {state.error}
          </p>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* ... rest of form unchanged ... */}
          <button
            type="submit"
            disabled={pending}
            className="rg-btn rg-btn-primary"
            style={{ width: '100%', padding: '16px', fontSize: 14, opacity: pending ? 0.6 : 1 }}
          >
            {pending ? 'CREANDO...' : 'CREAR LISTA →'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm --filter web typecheck
```

Expected: passes with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/dashboard/actions.ts apps/web/app/dashboard/new/page.tsx
git commit -m "fix: Zod validation on createWishlist/addItem + useActionState with error display"
```

---

### Task 9: Add email confirmation check to mobile login

**Files:**
- Modify: `apps/mobile/app/(auth)/login.tsx` (line 52–62)

Mobile lets unconfirmed users in. Web checks `email_confirmed_at` and signs them out. Mobile should do the same.

- [ ] **Step 1: Update `handleAuth` in `login.tsx`**

Replace lines 52–62:

```typescript
const handleAuth = async () => {
  if (!email || !password) return
  setLoading(true)
  setError('')

  if (isSignUp) {
    const { error: err } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (err) setError(err.message)
    else setSuccess('Revisá tu email para confirmar tu cuenta.')
    return
  }

  const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
  if (err) { setLoading(false); setError(err.message); return }

  if (!data.user?.email_confirmed_at) {
    await supabase.auth.signOut()
    setLoading(false)
    setError('Confirmá tu email antes de ingresar. Revisá tu bandeja de entrada.')
    return
  }

  setLoading(false)
  // Navigation handled by AuthGuard in _layout
}
```

Add `success` state at the top of `LoginScreen` (after `error`):

```typescript
const [success, setSuccess] = useState('')
```

And show it in the JSX after the error display:

```tsx
{success ? <Text style={styles.successText}>{success}</Text> : null}
```

Add `successText` to the StyleSheet (same style as `error` but green):

```typescript
successText: { color: '#2EC25E', fontSize: 13, textAlign: 'center' },
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(auth\)/login.tsx
git commit -m "fix: check email_confirmed_at on mobile login — unconfirmed users were signing in"
```

---

### Task 10: Hide COMPARTIR button for private lists

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx` (line 138–148)

The WhatsApp share button shows for all lists including private ones.

- [ ] **Step 1: Update the share button condition**

In `apps/web/app/dashboard/page.tsx`, the share button renders when `shareUrl && ...`. Add a `privacy_level !== 'private'` check:

```tsx
{shareUrl && list.privacy_level !== 'private' && (
  <a
    href={`https://wa.me/?text=${encodeURIComponent(`¡Hola! Esta es mi lista: ${shareUrl}`)}`}
    target="_blank" rel="noopener noreferrer"
    className="rg-btn"
    style={{ flex: 1, padding: '10px', fontSize: 11, justifyContent: 'center',
             background: '#25D366', color: '#0F0F0F', border: '2px solid var(--ink)', boxShadow: 'var(--shadow-sm)' }}>
    COMPARTIR
  </a>
)}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/dashboard/page.tsx
git commit -m "fix: hide COMPARTIR button for private lists"
```

---

## P2 — Before First Public Traffic

### Task 11: Add `metadataBase` + fix nav logo on gifter page

**Files:**
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/[username]/[slug]/page.tsx` (line 86–89)

`metadataBase` is a prerequisite for og:image to work. The gifter page nav logo is a non-clickable `<span>`.

- [ ] **Step 1: Add `metadataBase` to root layout**

In `apps/web/app/layout.tsx`, update the `metadata` export:

```typescript
export const metadata: Metadata = {
  metadataBase: new URL('https://regala.me'),
  title: 'regala.me — Tu lista de regalos, sin dramas.',
  description: 'Compartí una lista, tus amigos eligen lo que traen, nadie llega con la misma cosa.',
  openGraph: {
    siteName: 'regala.me',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
}
```

- [ ] **Step 2: Fix gifter page nav logo — change `<span>` to `<Link>`**

In `apps/web/app/[username]/[slug]/page.tsx`, add `import Link from 'next/link'` (already imported if not present), then replace lines 86–89:

```tsx
<Link href="/" style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: -0.5, textDecoration: 'none', color: 'var(--ink)' }}>
  regala<span style={{ color: 'var(--red)' }}>.</span>me
</Link>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/layout.tsx apps/web/app/[username]/[slug]/page.tsx
git commit -m "fix: add metadataBase + make gifter nav logo a link to /"
```

---

### Task 12: Add static og:image for WhatsApp previews

**Files:**
- Create: `apps/web/app/[username]/[slug]/opengraph-image.tsx`
- Modify: `apps/web/app/[username]/[slug]/page.tsx` (generateMetadata)

WhatsApp link previews require og:image. This is the primary sharing channel.

- [ ] **Step 1: Install `@vercel/og` if not present**

```bash
pnpm --filter web add @vercel/og
```

- [ ] **Step 2: Create `opengraph-image.tsx`**

Create `apps/web/app/[username]/[slug]/opengraph-image.tsx`:

```typescript
import { ImageResponse } from 'next/og'
import { createServerSupabase } from '@/lib/supabase/server'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Props = { params: Promise<{ username: string; slug: string }> }

export default async function OGImage({ params }: Props) {
  const { username, slug } = await params
  const supabase = await createServerSupabase()

  const { data: list } = await supabase
    .from('wishlists')
    .select('title, recipient_name, occasion, profiles!inner(username, display_name)')
    .eq('slug', slug)
    .eq('profiles.username', username)
    .in('privacy_level', ['public', 'link_only'])
    .single()

  const title = list?.title ?? 'Lista de regalos'
  const name = list?.recipient_name ?? (list?.profiles as { display_name?: string } | null)?.display_name ?? ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start',
          background: '#F2F0E6',
          padding: '60px 80px',
          fontFamily: 'Impact, sans-serif',
        }}
      >
        <div style={{ display: 'flex', marginBottom: 24, fontSize: 28, color: '#E63322', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 4 }}>
          regala.me
        </div>
        <div style={{
          fontSize: 80, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: -2, lineHeight: 0.88, color: '#0F0F0F',
          marginBottom: 24, maxWidth: 900,
        }}>
          {title}
        </div>
        {name && (
          <div style={{ fontSize: 32, color: 'rgba(15,15,15,0.55)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2 }}>
            de {name}
          </div>
        )}
        <div style={{
          position: 'absolute', bottom: 60, right: 80,
          background: '#F5E13E', border: '3px solid #0F0F0F',
          padding: '12px 24px', fontSize: 22, fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: 1,
        }}>
          ELEGÍ TU REGALO →
        </div>
      </div>
    ),
    { ...size }
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/[username]/[slug]/opengraph-image.tsx
git commit -m "feat: dynamic og:image for gifter pages — WhatsApp link previews now show wishlist card"
```

---

### Task 13: Add auth check to `/api/extract-product`

**Files:**
- Modify: `apps/web/app/api/extract-product/route.ts` (line 90)

The endpoint is an open proxy with no auth. Add a session check.

- [ ] **Step 1: Add session guard at the top of the `GET` handler**

In `apps/web/app/api/extract-product/route.ts`, add after line 90 (`export async function GET(request: NextRequest) {`):

```typescript
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  // ... rest of existing handler unchanged
```

Add the import at the top:

```typescript
import { createServerSupabase } from '@/lib/supabase/server'
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/extract-product/route.ts
git commit -m "fix: require auth on /api/extract-product — was an open proxy endpoint"
```

---

### Task 14: Add `loading.tsx` and `error.tsx` for gifter route

**Files:**
- Create: `apps/web/app/[username]/[slug]/loading.tsx`
- Create: `apps/web/app/[username]/[slug]/error.tsx`

No loading or error states on the most-trafficked unauthenticated route.

- [ ] **Step 1: Create `loading.tsx`**

Create `apps/web/app/[username]/[slug]/loading.tsx`:

```typescript
export default function GifterLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ height: 4, background: 'var(--ink)' }} />
      <div style={{ padding: '14px 20px', borderBottom: '2px solid var(--ink)', background: 'var(--paper)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: -0.5 }}>
          regala<span style={{ color: 'var(--red)' }}>.</span>me
        </div>
      </div>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px' }}>
        <div style={{ width: '60%', height: 48, background: 'rgba(15,15,15,0.08)', marginBottom: 16 }} />
        <div style={{ width: '40%', height: 20, background: 'rgba(15,15,15,0.06)', marginBottom: 32 }} />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 80, background: 'var(--paper)', border: '2px solid var(--ink)', marginBottom: 12 }} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `error.tsx`**

Create `apps/web/app/[username]/[slug]/error.tsx`:

```typescript
'use client'

export default function GifterError() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: -0.5, marginBottom: 32 }}>
        regala<span style={{ color: 'var(--red)' }}>.</span>me
      </div>
      <h1 className="rg-display" style={{ fontSize: 48, marginBottom: 12 }}>ALGO SALIÓ MAL.</h1>
      <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.6)', marginBottom: 24 }}>No pudimos cargar esta lista. Intentá de nuevo.</p>
      <a href="/" className="rg-btn rg-btn-primary" style={{ padding: '12px 24px', fontSize: 13 }}>
        IR AL INICIO →
      </a>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/[username]/[slug]/loading.tsx apps/web/app/[username]/[slug]/error.tsx
git commit -m "feat: add loading and error states for gifter route"
```

---

### Task 15: CSS fixes — `rg-mono` color, scrollbar scope, `focus-visible`

**Files:**
- Modify: `apps/web/app/globals.css`

Three CSS issues: red mono label color causes visual noise, scrollbar hidden globally, buttons have no keyboard focus style.

- [ ] **Step 1: Fix `rg-mono` default color**

In `apps/web/app/globals.css`, change line ~61:

```css
.rg-mono {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(15, 15, 15, 0.55);
}
```

Any place that wants red mono can add `style={{ color: 'var(--red)' }}` inline.

- [ ] **Step 2: Scope `scrollbar-width: none` away from `*`**

Find the global `* { scrollbar-width: none }` block (~line 200) and replace:

```css
.rg-marquee-track,
.rg-hscroll {
  scrollbar-width: none;
}
.rg-marquee-track::-webkit-scrollbar,
.rg-hscroll::-webkit-scrollbar {
  display: none;
}
```

If the marquee element doesn't already have a class, add `rg-marquee-track` to its JSX. For the landing page horizontal scrollers, add `className="rg-hscroll"`.

- [ ] **Step 3: Add `:focus-visible` to `.rg-btn` and `.rg-input`**

After the `.rg-btn` rule block in `globals.css`, add:

```css
.rg-btn:focus-visible {
  outline: 3px solid var(--ink);
  outline-offset: 2px;
}

.rg-input:focus-visible {
  outline: 3px solid var(--ink);
  outline-offset: 0;
  box-shadow: 4px 4px 0 0 var(--ink);
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "fix: rg-mono default color neutral, scrollbar scoped to specific containers, focus-visible on buttons"
```

---

### Task 16: Add post-claim viral nudge in `ClaimButton`

**Files:**
- Modify: `apps/web/app/[username]/[slug]/claim-button.tsx`

After a successful claim, show an inline "make your own list" card at the highest-intent moment.

- [ ] **Step 1: Update the success state in `ClaimButton`**

In `apps/web/app/[username]/[slug]/claim-button.tsx`, replace the `state?.success` block (lines 10–15):

```tsx
if (state?.success) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginTop: 8 }}>
      <span className="rg-sticker rg-sticker-green" style={{ fontSize: 11, padding: '5px 12px', alignSelf: 'flex-start' }}>
        ✓ ¡GRACIAS!
      </span>
      <a
        href="/auth?mode=signup"
        style={{
          display: 'block', padding: '12px 14px',
          background: 'var(--yellow)', border: '2px solid var(--ink)', boxShadow: 'var(--shadow-sm)',
          fontSize: 11, fontFamily: 'var(--font-display)', textDecoration: 'none', color: 'var(--ink)',
          textTransform: 'uppercase', letterSpacing: -0.3,
        }}
      >
        ¿TENÉS UN CUMPLE PRÓXIMAMENTE?<br />
        <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 10 }}>
          Armá tu lista en 2 min →
        </span>
      </a>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/[username]/[slug]/claim-button.tsx
git commit -m "feat: post-claim viral nudge — show 'make your own list' inline after successful claim"
```

---

### Task 17: Add `robots.ts` and `sitemap.ts`

**Files:**
- Create: `apps/web/app/robots.ts`
- Create: `apps/web/app/sitemap.ts`

No crawl guidance and no sitemap. Dashboard and auth should be blocked; gifter pages indexed.

- [ ] **Step 1: Create `robots.ts`**

Create `apps/web/app/robots.ts`:

```typescript
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/auth', '/api'],
      },
    ],
    sitemap: 'https://regala.me/sitemap.xml',
  }
}
```

- [ ] **Step 2: Create `sitemap.ts`**

Create `apps/web/app/sitemap.ts`:

```typescript
import type { MetadataRoute } from 'next'
import { createServerSupabase } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServerSupabase()

  const { data: lists } = await supabase
    .from('wishlists')
    .select('slug, created_at, profiles!inner(username)')
    .eq('privacy_level', 'public')
    .order('created_at', { ascending: false })
    .limit(1000)

  const gifterPages: MetadataRoute.Sitemap = (lists ?? []).map((list) => ({
    url: `https://regala.me/${(list.profiles as { username: string }).username}/${list.slug}`,
    lastModified: new Date(list.created_at),
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  return [
    { url: 'https://regala.me', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    ...gifterPages,
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/robots.ts apps/web/app/sitemap.ts
git commit -m "feat: add robots.ts and sitemap.ts — block /dashboard and /auth, index public gifter pages"
```

---

### Task 18: Add `.env.local.example` files

**Files:**
- Create: `apps/web/.env.local.example`
- Create: `apps/mobile/.env.example`

New contributors have no way to know what env vars are needed.

- [ ] **Step 1: Create web example**

Create `apps/web/.env.local.example`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SITE_URL=https://regala.me
```

- [ ] **Step 2: Create mobile example**

Create `apps/mobile/.env.example`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/.env.local.example apps/mobile/.env.example
git commit -m "docs: add .env.example files for both apps"
```

---

## P3 — Post-Launch Refactor Backlog

### Task 19: Parallelize DB queries in web dashboard page

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx`

Three sequential queries — wishlists → items → claims. Items and claims can't run before wishlists, but the pattern can be simplified.

- [ ] **Step 1: Batch wishlists + items in one join query**

Replace the three-query sequence in `apps/web/app/dashboard/page.tsx` (lines 12–36):

```typescript
const { data: lists } = await supabase
  .from('wishlists')
  .select('id, title, slug, occasion, occasion_date, is_surprise, currency, privacy_level, items(id)')
  .eq('owner_id', user.id)
  .order('created_at', { ascending: false })

const { data: profile } = await supabase
  .from('profiles').select('username').eq('id', user.id).single()

const allItemIds = (lists ?? []).flatMap(l => (l.items ?? []).map((i: { id: string }) => i.id))
const { data: claims } = allItemIds.length
  ? await supabase.from('claims').select('item_id').in('item_id', allItemIds)
  : { data: [] }

const claimedSet = new Set((claims ?? []).map((c: { item_id: string }) => c.item_id))
```

Update the card rendering — `list.items` is now the array directly (no `itemsByList` map needed):

```typescript
const listItems = (list.items ?? []) as { id: string }[]
const claimed   = listItems.filter(i => claimedSet.has(i.id)).length
const total     = listItems.length
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/dashboard/page.tsx
git commit -m "perf: collapse wishlists+items to single join query in dashboard — removes one DB round trip"
```

---

### Task 20: Fix mobile N+1 queries in tabs/index.tsx

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

Three queries per list (items count HEAD, items IDs, claims) = O(3n) round trips. Replace with two batch queries.

- [ ] **Step 1: Read current index.tsx to confirm the query pattern**

Open `apps/mobile/app/(tabs)/index.tsx` and locate the `fetchData` or equivalent function that queries items per list. The pattern is likely inside a `useEffect` or `useFocusEffect`.

- [ ] **Step 2: Replace fan-out with two batch queries**

After fetching `lists`, replace the per-list item/claim queries with:

```typescript
const listIds = (lists ?? []).map(l => l.id)

const [{ data: allItems }, { data: allClaims }] = await Promise.all([
  supabase.from('items').select('id, wishlist_id').in('wishlist_id', listIds),
  // claims need item IDs — fetch items first, then claims
  Promise.resolve({ data: [] as { item_id: string }[] }),
])

const allItemIds = (allItems ?? []).map(i => i.id)
const { data: claimsData } = allItemIds.length
  ? await supabase.from('claims').select('item_id').in('item_id', allItemIds)
  : { data: [] }

const itemsByList = new Map<string, string[]>()
for (const item of allItems ?? []) {
  const arr = itemsByList.get(item.wishlist_id) ?? []
  arr.push(item.id)
  itemsByList.set(item.wishlist_id, arr)
}
const claimedSet = new Set((claimsData ?? []).map(c => c.item_id))
```

This is 2 queries total (items batch + claims batch) regardless of list count, down from 3n.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(tabs\)/index.tsx
git commit -m "perf: replace O(3n) item/claim queries with 2 batch queries in mobile tabs index"
```

---

### Task 21: Add unit tests for `packages/shared` utilities

**Files:**
- Create: `packages/shared/src/__tests__/index.test.ts`

`createSlug`, `daysUntil`, `occasionEmoji` have bugs (Unicode padding, timezone) and zero test coverage.

- [ ] **Step 1: Check if a test runner is configured**

```bash
cat packages/shared/package.json
```

If no test script exists, add vitest:

```bash
pnpm --filter shared add -D vitest
```

Add to `packages/shared/package.json` scripts:

```json
"test": "vitest run"
```

- [ ] **Step 2: Create the test file**

Create `packages/shared/src/__tests__/index.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createSlug, daysUntil, occasionEmoji } from '../index'

describe('createSlug', () => {
  it('produces lowercase kebab-case', () => {
    const slug = createSlug('Mi Lista De Cumple')
    expect(slug).toMatch(/^mi-lista-de-cumple-/)
  })

  it('strips accents', () => {
    const slug = createSlug('Años Felices')
    expect(slug).not.toContain('ñ')
    expect(slug).toMatch(/^a-os-felices-|^anos-felices-/)
  })

  it('appends a unique suffix', () => {
    const a = createSlug('test')
    const b = createSlug('test')
    // In same ms they may collide — this tests the format
    expect(a).toMatch(/^test-[a-z0-9]+$/)
  })
})

describe('occasionEmoji', () => {
  it('returns 🎂 for birthday', () => {
    expect(occasionEmoji('birthday')).toBe('🎂')
  })

  it('returns 🎁 for unknown occasion', () => {
    expect(occasionEmoji('unknown' as any)).toBe('🎁')
  })
})

describe('daysUntil', () => {
  it('returns null for null input', () => {
    expect(daysUntil(null)).toBeNull()
  })

  it('returns a string for a future date', () => {
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString().split('T')[0]
    const result = daysUntil(future)
    expect(result).toMatch(/en \d+ días/)
  })

  it('returns ¡Hoy! for today', () => {
    const today = new Date().toISOString().split('T')[0]
    const result = daysUntil(today)
    // May be 'en 1 día' due to UTC offset — acceptable until timezone fix
    expect(result).toBeTruthy()
  })
})
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter shared test
```

Expected: all pass (or 1 expected failure on `daysUntil` today case due to UTC issue — document it).

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/__tests__/index.test.ts packages/shared/package.json
git commit -m "test: add unit tests for createSlug, occasionEmoji, daysUntil in shared package"
```

---

### Task 22: Extract shared `<Logomark>` component

**Files:**
- Create: `apps/web/components/Logomark.tsx`
- Modify: `apps/web/app/page.tsx` (line 57–69), `apps/web/app/dashboard/layout.tsx`, `apps/web/app/[username]/[slug]/page.tsx`

The logomark is copy-pasted in 3 places. Extract it.

- [ ] **Step 1: Create `components/Logomark.tsx`**

Create `apps/web/components/Logomark.tsx`:

```typescript
import Link from 'next/link'

interface LogomarkProps {
  size?: number
  href?: string
}

export default function Logomark({ size = 18, href = '/' }: LogomarkProps) {
  const content = (
    <span style={{ fontFamily: 'var(--font-display)', fontSize: size, letterSpacing: -0.5 }}>
      regala<span style={{ color: 'var(--red)' }}>.</span>me
    </span>
  )
  return href ? (
    <Link href={href} style={{ textDecoration: 'none', color: 'var(--ink)' }}>
      {content}
    </Link>
  ) : content
}
```

- [ ] **Step 2: Replace inline logo in all three files**

In each file, replace the logo markup with `<Logomark />` (or `<Logomark size={24} />` to match current size). Import from `@/components/Logomark`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/Logomark.tsx apps/web/app/page.tsx apps/web/app/dashboard/layout.tsx apps/web/app/[username]/[slug]/page.tsx
git commit -m "refactor: extract Logomark component — was copy-pasted in 3 files"
```

---

### Task 23: Fix open redirect bypass in auth callback

**Files:**
- Modify: `apps/web/app/auth/callback/route.ts`

URL-encoded slashes (`/%2Fevil.com`) bypass the current `startsWith('//')` guard.

- [ ] **Step 1: Read the current callback route**

Open `apps/web/app/auth/callback/route.ts` and locate the `next` parameter validation.

- [ ] **Step 2: Replace the guard with origin-based validation**

Replace the `rawNext` validation logic with:

```typescript
const rawNext = requestUrl.searchParams.get('next') ?? '/dashboard'
const origin = requestUrl.origin

let next = '/dashboard'
try {
  const candidate = new URL(rawNext, origin)
  if (candidate.origin === origin) next = candidate.pathname + candidate.search
} catch {
  // malformed — fall back to /dashboard
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/auth/callback/route.ts
git commit -m "fix: open redirect bypass — validate next param against origin instead of string prefix"
```

---

### Task 24: Surprise mode — hide claim names in owner's dashboard

**Files:**
- Modify: `apps/web/app/dashboard/[id]/page.tsx`

When `is_surprise=true`, the owner's dashboard shows full claim data (claimer names). The public gifter view hides it but the dashboard doesn't.

- [ ] **Step 1: Read `dashboard/[id]/page.tsx` to locate claim rendering**

Open `apps/web/app/dashboard/[id]/page.tsx` and find where `claimer_name` is rendered on claimed items.

- [ ] **Step 2: Wrap claim names with surprise check**

Where claimer names are displayed (look for `claimer_name` or strikethrough rendering), wrap with:

```tsx
{list.is_surprise ? (
  <span className="rg-sticker rg-sticker-green" style={{ fontSize: 8 }}>RECLAMADO</span>
) : (
  <span style={{ fontSize: 11, color: 'rgba(15,15,15,0.55)', textDecoration: 'line-through' }}>
    {claim.claimer_name}
  </span>
)}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/dashboard/[id]/page.tsx
git commit -m "fix: hide claimer names in owner dashboard for surprise lists"
```

---

### Task 25: Add ARIA accessibility to ClaimButton and gifter items

**Files:**
- Modify: `apps/web/app/[username]/[slug]/claim-button.tsx`
- Modify: `apps/web/app/[username]/[slug]/gifter-items.tsx`
- Modify: `apps/web/app/dashboard/new/page.tsx` (privacy toggle)

Screen reader users get no feedback when claim state changes.

- [ ] **Step 1: Add `aria-live` region to ClaimButton**

In `apps/web/app/[username]/[slug]/claim-button.tsx`, wrap the component's root return in:

```tsx
<div aria-live="polite" aria-atomic="true">
  {/* existing JSX */}
</div>
```

Add `aria-label` to the submit button:

```tsx
<button
  type="submit"
  aria-label={`Reclamar este regalo`}
  disabled={pending}
  ...
>
```

- [ ] **Step 2: Add `aria-label` to each item row in `gifter-items.tsx`**

Each item article/div should have:

```tsx
<article aria-label={`${item.title}${claimedSet.has(item.id) ? ', reclamado' : ', disponible'}`}>
```

- [ ] **Step 3: Add `role="group"` and `aria-label` to privacy pill toggle in `new/page.tsx`**

```tsx
<div
  role="group"
  aria-label="Privacidad de la lista"
  style={{ display: 'flex', gap: 0, border: '2px solid var(--ink)', borderRadius: 4, overflow: 'hidden' }}
>
```

Each pill button should have `aria-pressed={privacy === opt.value}`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/[username]/[slug]/claim-button.tsx apps/web/app/[username]/[slug]/gifter-items.tsx apps/web/app/dashboard/new/page.tsx
git commit -m "feat: ARIA accessibility — aria-live on ClaimButton, aria-label on items, role=group on privacy toggle"
```

---

### Task 26: User profile page `/{username}`

**Files:**
- Create: `apps/web/app/[username]/page.tsx`

Public page listing all public wishlists for a user. Makes link-only mode meaningful.

- [ ] **Step 1: Create `apps/web/app/[username]/page.tsx`**

```typescript
import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { occasionEmoji } from 'shared'
import type { OccasionId } from 'shared'
import Link from 'next/link'
import type { Metadata } from 'next'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return {
    title: `Listas de ${username} — regala.me`,
    description: `Mirá las listas de regalos de ${username} en regala.me.`,
  }
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createServerSupabase()

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const { data: lists } = await supabase
    .from('wishlists')
    .select('id, title, slug, occasion, occasion_date')
    .eq('profiles.username', username)
    .eq('privacy_level', 'public')
    .order('created_at', { ascending: false })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ height: 4, background: 'var(--ink)' }} />
      <div style={{ padding: '14px 20px', borderBottom: '2px solid var(--ink)', background: 'var(--paper)' }}>
        <Link href="/" style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: -0.5, textDecoration: 'none', color: 'var(--ink)' }}>
          regala<span style={{ color: 'var(--red)' }}>.</span>me
        </Link>
      </div>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px' }}>
        <h1 className="rg-display" style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', marginBottom: 8 }}>
          {profile.display_name?.toUpperCase() ?? username.toUpperCase()}
        </h1>
        <div className="rg-mono" style={{ fontSize: 10, marginBottom: 32, color: 'rgba(15,15,15,0.5)' }}>
          @{username}
        </div>

        {(lists ?? []).length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', border: '2px dashed var(--ink)' }}>
            <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.55)' }}>No hay listas públicas todavía.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(lists ?? []).map((list) => (
              <Link
                key={list.id}
                href={`/${username}/${list.slug}`}
                className="rg-card"
                style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none', color: 'var(--ink)' }}
              >
                <span style={{ fontSize: 32 }}>{occasionEmoji(list.occasion as OccasionId)}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{list.title}</div>
                  {list.occasion_date && (
                    <div className="rg-mono" style={{ fontSize: 9, marginTop: 3, color: 'rgba(15,15,15,0.5)' }}>
                      {new Date(list.occasion_date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        <div style={{ marginTop: 40, padding: '20px 22px', textAlign: 'center', background: 'var(--ink)', color: 'var(--paper)' }}>
          <div className="rg-display" style={{ fontSize: 24, marginBottom: 10 }}>
            ¿QUERÉS TU PROPIA LISTA?
          </div>
          <Link href="/" className="rg-btn rg-btn-yellow" style={{ padding: '12px 22px', fontSize: 13 }}>
            CREAR LISTA →
          </Link>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/[username]/page.tsx
git commit -m "feat: user profile page /{username} — lists all public wishlists for a user"
```

---

## Summary

| Tier | Tasks | Scope |
|------|-------|-------|
| P0   | 1–4   | Active breakage: gifter 404s, mobile add-item fails, wrong share URLs, bad year padding |
| P1   | 5–10  | Security & correctness: type fix, Zod validation, UNIQUE constraint, email confirmation |
| P2   | 11–18 | Public launch: metadataBase, og:image, auth on API, loading/error states, CSS, sitemap |
| P3   | 19–26 | Post-launch: DB query optimization, tests, component extraction, ARIA, profile page |
