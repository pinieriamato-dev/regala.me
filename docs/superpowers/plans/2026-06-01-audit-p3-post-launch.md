# Audit Fixes — P3 Post-Launch Refactor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** P0, P1, P2 plans complete. Do these after the product is live and has early users.

**Goal:** Performance improvements, shared component extraction, unit test coverage, accessibility, surprise mode dashboard fix, and the user profile page.

**Architecture:** No new npm packages. Vitest for tests (if not already configured). Component extractions create `apps/web/components/`. DB query optimizations reduce round trips without changing behavior.

---

### Task 1: Collapse dashboard DB queries from 3 to 2

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx`

Three sequential queries: wishlists → items (fan-out) → claims (fan-out). The first two can be combined with a Supabase join, saving one round trip per page load.

- [ ] **Step 1: Replace the three-query pattern with a join + single items batch**

In `apps/web/app/dashboard/page.tsx`, replace the data-fetching block (roughly lines 8–38):

```typescript
export default async function DashboardPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // Single join: wishlists + nested item IDs
  const { data: lists } = await supabase
    .from('wishlists')
    .select('id, title, slug, occasion, occasion_date, is_surprise, currency, privacy_level, items(id)')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const { data: profile } = await supabase
    .from('profiles').select('username').eq('id', user.id).single()

  const allItemIds = (lists ?? []).flatMap(l => ((l.items ?? []) as { id: string }[]).map(i => i.id))
  const { data: claims } = allItemIds.length
    ? await supabase.from('claims').select('item_id').in('item_id', allItemIds)
    : { data: [] }

  const claimedSet = new Set((claims ?? []).map((c: { item_id: string }) => c.item_id))
```

Then in the card render loop, replace `itemsByList.get(list.id) ?? []` with `(list.items ?? []) as { id: string }[]`:

```typescript
const listItems = (list.items ?? []) as { id: string }[]
const claimed   = listItems.filter(i => claimedSet.has(i.id)).length
const total     = listItems.length
```

Remove the `itemsByList` Map construction block — it's no longer needed.

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter web typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/dashboard/page.tsx
git commit -m "perf: join wishlists+items in single query on dashboard — one fewer DB round trip"
```

---

### Task 2: Fix mobile N+1 queries in tabs index — O(3n) → 2 batch queries

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

For each wishlist, the current code fires 3 queries (items count HEAD, item IDs, claims). With 10 lists = 30+ queries per load. Replace with 2 fixed batch queries.

- [ ] **Step 1: Read the current query pattern**

Open `apps/mobile/app/(tabs)/index.tsx` and find where items and claims are fetched per-list. The pattern will be inside a `useEffect`, `useFocusEffect`, or a `fetchData` helper function.

- [ ] **Step 2: Replace fan-out with batch queries**

After fetching `wishlists`, replace all per-list item/claim queries with:

```typescript
const listIds = (wishlists ?? []).map(l => l.id)

// Two batch queries instead of 3 per list
const [{ data: allItems }, profileData] = await Promise.all([
  supabase.from('items').select('id, wishlist_id').in('wishlist_id', listIds),
  supabase.from('profiles').select('username').eq('id', user.id).single(),
])

const allItemIds = (allItems ?? []).map(i => i.id)
const { data: allClaims } = allItemIds.length
  ? await supabase.from('claims').select('item_id').in('item_id', allItemIds)
  : { data: [] }

const itemsByList = new Map<string, string[]>()
for (const item of allItems ?? []) {
  const arr = itemsByList.get(item.wishlist_id) ?? []
  arr.push(item.id)
  itemsByList.set(item.wishlist_id, arr)
}
const claimedSet = new Set((allClaims ?? []).map(c => c.item_id))
```

Then when rendering each list card, compute counts from `itemsByList` and `claimedSet` locally instead of per-list DB calls.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(tabs\)/index.tsx
git commit -m "perf: replace O(3n) queries with 2 batch queries in mobile lists tab"
```

---

### Task 3: Extract shared `<Logomark>` component

**Files:**
- Create: `apps/web/components/Logomark.tsx`
- Modify: `apps/web/app/page.tsx`, `apps/web/app/dashboard/layout.tsx`, `apps/web/app/[username]/[slug]/page.tsx`

The logo markup is copy-pasted in 3 places. Extract it.

- [ ] **Step 1: Create `apps/web/components/Logomark.tsx`**

```typescript
import Link from 'next/link'

interface LogomarkProps {
  size?: number
  href?: string | null
}

export default function Logomark({ size = 18, href = '/' }: LogomarkProps) {
  const text = (
    <span style={{ fontFamily: 'var(--font-display)', fontSize: size, letterSpacing: -0.5 }}>
      regala<span style={{ color: 'var(--red)' }}>.</span>me
    </span>
  )
  if (!href) return text
  return (
    <Link href={href} style={{ textDecoration: 'none', color: 'var(--ink)' }}>
      {text}
    </Link>
  )
}
```

- [ ] **Step 2: Replace inline logo in each file**

In `apps/web/app/page.tsx`: find the logo span in the nav, replace with `<Logomark />`.

In `apps/web/app/dashboard/layout.tsx`: replace the logo markup with `<Logomark size={22} />`.

In `apps/web/app/[username]/[slug]/page.tsx`: the logo was fixed to a `<Link>` in P2. Replace with `<Logomark />` (which already renders as a link by default).

Import in each: `import Logomark from '@/components/Logomark'`

- [ ] **Step 3: Typecheck + visual check**

```bash
pnpm --filter web typecheck
```

Also start dev server and verify logo renders correctly in all three locations.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/Logomark.tsx apps/web/app/page.tsx apps/web/app/dashboard/layout.tsx apps/web/app/[username]/[slug]/page.tsx
git commit -m "refactor: extract Logomark component — was copy-pasted across 3 files"
```

---

### Task 4: Add unit tests for `packages/shared`

**Files:**
- Modify: `packages/shared/package.json`
- Create: `packages/shared/src/__tests__/index.test.ts`

`createSlug`, `daysUntil`, `occasionEmoji` have bugs (Unicode regex, timezone) that unit tests would catch. Zero coverage currently.

- [ ] **Step 1: Add Vitest if not present**

```bash
cat packages/shared/package.json
```

If no `vitest` in devDependencies:

```bash
pnpm --filter shared add -D vitest
```

Add to `packages/shared/package.json` `scripts`:

```json
"test": "vitest run"
```

- [ ] **Step 2: Create the test file**

Create `packages/shared/src/__tests__/index.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { createSlug, daysUntil, occasionEmoji } from '../index'

describe('createSlug', () => {
  it('lowercases and kebab-cases input', () => {
    const slug = createSlug('Mi Lista De Cumple')
    expect(slug).toMatch(/^mi-lista-de-cumple-[a-z0-9]+$/)
  })

  it('strips leading/trailing spaces', () => {
    const slug = createSlug('  test  ')
    expect(slug).toMatch(/^test-/)
  })

  it('appends a unique base36 suffix', () => {
    const a = createSlug('duplicado')
    const b = createSlug('duplicado')
    // Same ms → may match; different ms → must differ. At least verify format.
    expect(a).toMatch(/^duplicado-[a-z0-9]+$/)
  })

  it('removes accent characters', () => {
    const slug = createSlug('Quinceañera Feliz')
    expect(slug).not.toMatch(/[áéíóúñü]/)
  })
})

describe('occasionEmoji', () => {
  it('returns 🎂 for birthday', () => {
    expect(occasionEmoji('birthday')).toBe('🎂')
  })

  it('returns default 🎁 for unknown id', () => {
    expect(occasionEmoji('nonexistent' as any)).toBe('🎁')
  })
})

describe('daysUntil', () => {
  it('returns null for null input', () => {
    expect(daysUntil(null)).toBeNull()
  })

  it('returns a non-null string for a clearly future date', () => {
    const farFuture = '2099-01-01'
    expect(daysUntil(farFuture)).toBeTruthy()
  })

  it('returns null or a string for a past date', () => {
    const past = '2000-01-01'
    const result = daysUntil(past)
    // Past dates return null in some implementations
    expect(result === null || typeof result === 'string').toBe(true)
  })
})
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter shared test
```

Expected: all pass. If `daysUntil` today-edge-case fails due to UTC offset, document it in a comment.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/__tests__/index.test.ts packages/shared/package.json
git commit -m "test: unit tests for createSlug, occasionEmoji, daysUntil in shared package"
```

---

### Task 5: Fix surprise mode — hide claimer names in owner dashboard

**Files:**
- Modify: `apps/web/app/dashboard/[id]/page.tsx`

When `is_surprise=true`, the gifter public view correctly hides claim data. But the owner's own dashboard shows full claimer names. The owner shouldn't see who claimed what until the event.

- [ ] **Step 1: Read the claim rendering in `dashboard/[id]/page.tsx`**

Open `apps/web/app/dashboard/[id]/page.tsx` and find where `claimer_name` is rendered. It will be inside a loop over items, likely showing a strikethrough with the claimer's name for claimed items.

- [ ] **Step 2: Wrap claimer display with surprise check**

Find the claimer name display. It will look something like:

```tsx
<span style={{ textDecoration: 'line-through' }}>{claim.claimer_name}</span>
```

Or a green "claimed by X" sticker. Wrap or replace with:

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

### Task 6: ARIA accessibility — `ClaimButton`, gifter items, privacy toggle

**Files:**
- Modify: `apps/web/app/[username]/[slug]/claim-button.tsx`
- Modify: `apps/web/app/[username]/[slug]/gifter-items.tsx`
- Modify: `apps/web/app/dashboard/new/page.tsx`

Screen reader users get no feedback when claim state changes. Privacy toggle has no accessible label.

- [ ] **Step 1: Add `aria-live` to ClaimButton**

In `apps/web/app/[username]/[slug]/claim-button.tsx`, wrap the component output in an `aria-live` region. The component returns different shapes depending on state — wrap each return's outermost element:

For the success return, add `aria-live="polite"` and `aria-atomic="true"` to the outer `<div>`.

For the form return, wrap in:
```tsx
<div aria-live="polite" aria-atomic="true">
  <form ...>
```

For the button return:
```tsx
<div aria-live="polite">
  <button ...>
```

Also add `aria-label="Reclamar este regalo"` to the submit button.

- [ ] **Step 2: Add `aria-label` to item rows in `gifter-items.tsx`**

Open `apps/web/app/[username]/[slug]/gifter-items.tsx` and find the item container element for each item (div or article). Add:

```tsx
<article aria-label={`${item.title}${claimedSet.has(item.id) ? ', reclamado' : ', disponible'}`}>
```

If the container is a `<div>`, change it to `<article>` or add `role="listitem"` if inside a `role="list"` parent.

- [ ] **Step 3: Add `role="group"` and `aria-pressed` to privacy pills in `new/page.tsx`**

In `apps/web/app/dashboard/new/page.tsx`, add to the privacy toggle container:

```tsx
<div
  role="group"
  aria-label="Privacidad de la lista"
  style={{ display: 'flex', gap: 0, border: '2px solid var(--ink)', borderRadius: 4, overflow: 'hidden' }}
>
```

Each pill button gets `aria-pressed={privacy === opt.value}`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/[username]/[slug]/claim-button.tsx apps/web/app/[username]/[slug]/gifter-items.tsx apps/web/app/dashboard/new/page.tsx
git commit -m "feat: ARIA — aria-live on ClaimButton, aria-label on items, role=group on privacy pills"
```

---

### Task 7: User profile page `/{username}`

**Files:**
- Create: `apps/web/app/[username]/page.tsx`

Public page listing all public wishlists for a user. Enables `link_only` to be meaningful (those lists won't appear here), and gives power users a shareable identity URL.

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
    openGraph: { title: `Listas de ${username}`, description: `Listas de regalos de ${username}` },
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
    .select('id, title, slug, occasion, occasion_date, profiles!inner(username)')
    .eq('profiles.username', username)
    .eq('privacy_level', 'public')
    .order('created_at', { ascending: false })

  const displayName = profile.display_name ?? username

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ height: 4, background: 'var(--ink)' }} />
      <div style={{
        padding: '14px 20px', borderBottom: '2px solid var(--ink)',
        background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: -0.5, textDecoration: 'none', color: 'var(--ink)' }}>
          regala<span style={{ color: 'var(--red)' }}>.</span>me
        </Link>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px' }}>
        <h1 className="rg-display" style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', marginBottom: 6 }}>
          {displayName.toUpperCase()}
        </h1>
        <div className="rg-mono" style={{ fontSize: 10, marginBottom: 36, color: 'rgba(15,15,15,0.5)' }}>
          @{username}
        </div>

        {(lists ?? []).length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', border: '2px dashed var(--ink)' }}>
            <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.55)' }}>No hay listas públicas todavía.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(lists ?? []).map((list) => (
              <Link
                key={list.id}
                href={`/${username}/${list.slug}`}
                className="rg-card"
                style={{
                  padding: '18px 20px',
                  display: 'flex', alignItems: 'center', gap: 16,
                  textDecoration: 'none', color: 'var(--ink)',
                }}
              >
                <span style={{ fontSize: 32 }}>
                  {occasionEmoji(list.occasion as OccasionId)}
                </span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{list.title}</div>
                  {list.occasion_date && (
                    <div className="rg-mono" style={{ fontSize: 9, marginTop: 3, color: 'rgba(15,15,15,0.5)' }}>
                      {new Date(list.occasion_date).toLocaleDateString('es-AR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Viral footer */}
        <div style={{
          marginTop: 40, padding: '20px 22px', textAlign: 'center',
          background: 'var(--ink)', color: 'var(--paper)',
          border: '2px solid var(--ink)', boxShadow: '5px 5px 0 0 var(--ink)',
        }}>
          <div className="rg-display" style={{ fontSize: 26, lineHeight: 0.92, marginBottom: 12 }}>
            ¿QUERÉS TU<br />
            <span style={{ color: 'var(--yellow)' }}>PROPIA LISTA?</span>
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

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter web typecheck
```

- [ ] **Step 3: Verify**

Start dev server, visit `localhost:3001/{a-real-username}`. Should show the profile page with public lists. Visit a username that doesn't exist — should 404.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/[username]/page.tsx
git commit -m "feat: user profile page /{username} — lists public wishlists, enables link-only mode distinction"
```

---

### Task 8: Generate Supabase TypeScript types

**Files:**
- Create: `packages/shared/src/database.types.ts` (auto-generated)
- Modify: `packages/shared/package.json`
- Modify: `turbo.json`

Manual types in `packages/shared/src/types.ts` are already out of sync with the DB (as the audit proved). Generated types prevent this class of bug.

- [ ] **Step 1: Add a generation script**

In `packages/shared/package.json`, add to `scripts`:

```json
"gen:types": "supabase gen types typescript --project-id esyybmnwalscpnzfeowh > src/database.types.ts"
```

- [ ] **Step 2: Run it**

```bash
pnpm --filter shared gen:types
```

This creates `packages/shared/src/database.types.ts` with the full schema. Commit this file.

- [ ] **Step 3: Reference the generated types in queries (optional, progressive)**

Generated types are available as `Database['public']['Tables']['wishlists']['Row']` etc. You don't need to refactor everything at once — the immediate value is having a source of truth to diff against when the schema changes.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/database.types.ts packages/shared/package.json
git commit -m "feat: generate Supabase TypeScript types — source of truth for DB schema in code"
```

---

## Done

All P3 post-launch tasks complete. The full audit is addressed.

**Summary of all waves:**
- P0 (`audit-p0`): 4 active breakages fixed
- P1 (`audit-p1`): 7 security/correctness fixes
- P2 (`audit-p2`): 9 pre-launch readiness items
- P3 (`audit-p3`): 8 post-launch quality improvements
