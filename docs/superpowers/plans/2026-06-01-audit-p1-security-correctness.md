# Audit Fixes — P1 Security & Correctness

> ✅ **All P1 tasks completed** — merged into `fix/p0-launch-blockers` on 2026-06-08. Tasks 5–10 done.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** P0 plan (`2026-06-01-audit-p0-launch-blockers.md`) must be complete first.

**Goal:** Harden the app before it receives real public traffic — fix the shared type, validate all inputs with Zod, prevent claim abuse, block unconfirmed mobile logins, and hide the share button for private lists.

**Architecture:** Supabase migration for the UNIQUE constraint. Zod added to dashboard actions (already used in auth actions). Server action signature updated to use `useActionState`. No new dependencies beyond `zod` (already installed).

**Tech Stack:** Next.js 15 Server Actions, React 19 `useActionState`, Zod, Supabase MCP migrations, Expo React Native.

---

### Task 1: Add `privacy_level` to shared `Wishlist` type

**Files:**
- Modify: `packages/shared/src/types.ts`

The `Wishlist` interface is missing `privacy_level`, causing TypeScript to silently accept the schema mismatch found in the audit (§1.1, §6.4).

- [ ] **Step 1: Add the type**

In `packages/shared/src/types.ts`, add before the `Wishlist` interface:

```typescript
export type PrivacyLevel = 'public' | 'link_only' | 'private'
```

Then add `privacy_level` to the `Wishlist` interface:

```typescript
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

- [ ] **Step 2: Run typecheck to surface any downstream issues**

```bash
pnpm typecheck
```

Fix any errors (likely none — the field was previously untyped in query results).

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types.ts
git commit -m "fix: add privacy_level to Wishlist type — was missing, enabling silent schema mismatches"
```

---

### Task 2: Add `privacy_level: 'public'` to mobile create-list insert

**Files:**
- Modify: `apps/mobile/app/create-list.tsx`

Mobile always inserts without `privacy_level`, so mobile-created lists also get `NULL` in the column — same gifter 404 bug as the web (fixed in P0 for web). No privacy UI needed on mobile yet; default to `'public'`.

- [ ] **Step 1: Add `privacy_level` to the insert**

In `apps/mobile/app/create-list.tsx`, the `.insert({...})` call (around line 36):

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

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/create-list.tsx
git commit -m "fix: set privacy_level='public' on mobile wishlist creation — NULL was breaking gifter page"
```

---

### Task 3: Add UNIQUE constraint on `claims(item_id)` + friendly error handling

**Files:**
- Supabase migration (via MCP tool)
- Modify: `apps/web/app/[username]/[slug]/actions.ts`

A double-tap or slow reload creates duplicate claims. The `claimItem` action also accepts any `item_id` — it never validates that the item belongs to the publicly-visible list being viewed (cross-list claim attack, audit §2.2).

- [ ] **Step 1: Apply migration via Supabase MCP**

Call `mcp__plugin_supabase_supabase__apply_migration` with:

```sql
ALTER TABLE claims ADD CONSTRAINT claims_item_id_unique UNIQUE (item_id);
```

Migration name: `add_unique_claim_per_item`

- [ ] **Step 2: Replace `apps/web/app/[username]/[slug]/actions.ts` entirely**

```typescript
'use server'

import { createServerSupabase } from '@/lib/supabase/server'
import { z } from 'zod'

type ClaimState = { error?: string; success?: boolean } | null

const claimSchema = z.object({
  item_id: z.string().uuid(),
  name: z.string().min(1, 'Ingresá tu nombre').max(100),
})

export async function claimItem(_prevState: ClaimState, formData: FormData): Promise<ClaimState> {
  const parsed = claimSchema.safeParse({
    item_id: formData.get('item_id'),
    name: (formData.get('name') as string | null)?.trim() ?? '',
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createServerSupabase()

  // Verify item belongs to a publicly accessible list — prevents cross-list claim
  const { data: item } = await supabase
    .from('items')
    .select('id, wishlists!inner(privacy_level)')
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

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter web typecheck
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/[username]/[slug]/actions.ts
git commit -m "fix: validate item belongs to public list + unique constraint on claims + friendly errors"
```

---

### Task 4: Add Zod validation to `createWishlist` and `addItem` + fix error display

**Files:**
- Modify: `apps/web/app/dashboard/actions.ts`
- Modify: `apps/web/app/dashboard/new/page.tsx`

`createWishlist` throws on DB error (no user feedback). `addItem` silently returns on failure. Neither validates input. Auth actions already use Zod — dashboard should match.

- [ ] **Step 1: Rewrite the top of `actions.ts` — add schemas and fix `createWishlist`**

Replace from the top of `apps/web/app/dashboard/actions.ts` through `createWishlist` (keep `deleteWishlist`, `addItem`, `deleteItem` below):

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

export type CreateWishlistState = { error: string } | null

export async function createWishlist(
  _prevState: CreateWishlistState,
  formData: FormData,
): Promise<CreateWishlistState> {
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

- [ ] **Step 2: Update `addItem` to use Zod**

Replace the `addItem` function in `apps/web/app/dashboard/actions.ts`:

```typescript
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

Keep `deleteWishlist` and `deleteItem` unchanged.

- [ ] **Step 3: Update `dashboard/new/page.tsx` — switch to `useActionState`**

The action signature changed to accept `(prevState, formData)`. Update `apps/web/app/dashboard/new/page.tsx`:

1. Change the import: add `useActionState` to the React import, remove `useTransition`
2. Add `CreateWishlistState` to the actions import
3. Replace the state and handler:

```typescript
// Replace:
const [pending, startTransition] = useTransition()

// With:
const [state, formAction, pending] = useActionState<CreateWishlistState, FormData>(createWishlist, null)
```

4. Change `handleSubmit` to call `formAction(fd)` instead of `startTransition(() => createWishlist(fd))`:

```typescript
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  const fd = new FormData(e.currentTarget)
  fd.set('occasion', occasion === 'personal' ? '' : occasion)
  fd.set('currency', currency)
  fd.set('privacy_level', privacy)
  if (surprise) fd.set('is_surprise', 'on')
  formAction(fd)
}
```

5. Add an error display just before the `<form>` open tag:

```tsx
{state?.error && (
  <p style={{
    color: 'var(--red)', fontWeight: 700, fontSize: 13,
    marginBottom: 16, padding: '10px 14px',
    border: '2px solid var(--red)', background: 'rgba(230,51,34,0.06)',
  }}>
    {state.error}
  </p>
)}
```

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter web typecheck
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/dashboard/actions.ts apps/web/app/dashboard/new/page.tsx
git commit -m "fix: Zod validation on dashboard actions + useActionState with error display on new list form"
```

---

### Task 5: Add email confirmation check to mobile login

**Files:**
- Modify: `apps/mobile/app/(auth)/login.tsx`

Mobile lets unconfirmed users log in. The web flow checks `email_confirmed_at` and signs them out. Mobile should match.

- [ ] **Step 1: Add `success` state (needed for signup confirmation message)**

In `apps/mobile/app/(auth)/login.tsx`, add after the `error` state:

```typescript
const [success, setSuccess] = useState('')
```

- [ ] **Step 2: Replace `handleAuth`**

Replace the `handleAuth` function (lines 52–62):

```typescript
const handleAuth = async () => {
  if (!email || !password) return
  setLoading(true)
  setError('')
  setSuccess('')

  if (isSignUp) {
    const { error: err } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (err) setError(err.message)
    else setSuccess('Revisá tu email para confirmar tu cuenta antes de ingresar.')
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
  // AuthGuard in _layout.tsx handles navigation
}
```

- [ ] **Step 3: Show `success` in JSX**

In the JSX, after `{error ? <Text style={styles.error}>{error}</Text> : null}`, add:

```tsx
{success ? <Text style={styles.successText}>{success}</Text> : null}
```

Add to the `StyleSheet`:

```typescript
successText: { color: '#2EC25E', fontSize: 13, textAlign: 'center' },
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(auth\)/login.tsx
git commit -m "fix: check email_confirmed_at on mobile sign-in — unconfirmed users were bypassing verification"
```

---

### Task 6: Hide COMPARTIR button for private lists

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx`

The WhatsApp share button appears for all lists including private ones — gifters can't open private lists anyway, so sharing them is confusing.

- [ ] **Step 1: Add `privacy_level` guard to the share button**

In `apps/web/app/dashboard/page.tsx`, the share button renders inside `{shareUrl && (...)}`. Tighten the condition:

```tsx
{shareUrl && list.privacy_level !== 'private' && (
  <a
    href={`https://wa.me/?text=${encodeURIComponent(`¡Hola! Esta es mi lista: ${shareUrl}`)}`}
    target="_blank" rel="noopener noreferrer"
    className="rg-btn"
    style={{
      flex: 1, padding: '10px', fontSize: 11, justifyContent: 'center',
      background: '#25D366', color: '#0F0F0F',
      border: '2px solid var(--ink)', boxShadow: 'var(--shadow-sm)',
    }}
  >
    COMPARTIR
  </a>
)}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/dashboard/page.tsx
git commit -m "fix: hide COMPARTIR button for private lists — sharing a private list link is pointless"
```

---

### Task 7: Fix open redirect bypass in auth callback

**Files:**
- Modify: `apps/web/app/auth/callback/route.ts`

The current guard (`startsWith('/')`, `!startsWith('//')`) is bypassed by URL-encoded slashes: `/%2Fevil.com` decodes to `//evil.com` before the check runs.

- [ ] **Step 1: Read the current guard**

Open `apps/web/app/auth/callback/route.ts` and find the `next` parameter validation block. It will look something like:

```typescript
const next = rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\')
  ? rawNext
  : '/dashboard'
```

- [ ] **Step 2: Replace with origin-based validation**

```typescript
const rawNext = requestUrl.searchParams.get('next') ?? '/dashboard'
const origin = requestUrl.origin

let next = '/dashboard'
try {
  const candidate = new URL(rawNext, origin)
  if (candidate.origin === origin) {
    next = candidate.pathname + candidate.search
  }
} catch {
  // malformed URL — keep default
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/auth/callback/route.ts
git commit -m "fix: open redirect bypass — validate next param against origin instead of string prefix check"
```

---

## Done

All P1 security and correctness fixes applied. Continue with `2026-06-01-audit-p2-public-launch.md`.
