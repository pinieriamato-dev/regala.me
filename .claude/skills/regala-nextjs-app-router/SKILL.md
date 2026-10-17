---
name: regala-nextjs-app-router
description: >-
  Next.js 15 App Router + React 18 + Zod v4 domain pack for regala.me's web app,
  scoped to the exact traps this repo hits. Load this when writing or debugging
  anything under apps/web/app/ — Server Actions in dashboard/actions.ts,
  auth/actions.ts or [username]/[slug]/actions.ts, client forms using
  useActionState (add-item-form.tsx, claim-button.tsx, dashboard/new/page.tsx),
  middleware.ts, or app/layout.tsx fonts. Load it when you see: React error #310
  ("rendered more hooks than expected"), a 500 "Event handlers cannot be passed
  to Client Component props", "Invalid input" on optional form fields, prices
  saved wrong (66500 → 66.5), "params should be awaited" / "cookies was called
  outside a request scope", or when adding a new mutation, form field, or
  validated input. Do NOT load for Supabase RLS/schema questions (use
  regala-supabase-and-rls), Expo/React Native (mobile), design tokens (see
  regala-docs-and-writing / CLAUDE.md §8), or process/git/deploy steps
  (regala-change-control).
---

# regala-nextjs-app-router

The framework-mechanics survival guide for `apps/web`. Read this before you touch
a Server Action, a `useActionState` form, `middleware.ts`, or fonts in
`app/layout.tsx`. Every rule below maps to a real symptom that has bitten this
repo (git-verified). Audience: a mid-level engineer or Sonnet-class model with
zero prior context.

Jargon defined once:
- **Server Component**: renders on the server, no browser JS, no hooks/handlers.
  Default for every file in `app/` that lacks `'use client'`.
- **Client Component**: file with `'use client'` at the top; runs in the browser,
  can use hooks (`useState`, `useEffect`, `useActionState`) and event handlers.
- **Server Action**: an `async` function in a file starting with `'use server'`
  (or a component with the directive). Callable from the client but executes on
  the server. All DB mutations in this repo are Server Actions.
- **RLS**: Row-Level Security — Postgres access rules enforced in Supabase. It is
  the real security boundary; the ownership checks in Actions are defence-in-depth.

## When NOT to use this / use instead

| You are actually doing… | Load instead |
|---|---|
| Writing/altering RLS policies, schema, `execute_sql`, `privacy_level` semantics | `regala-supabase-and-rls` |
| The architecture rules (why Supabase is server-only, the mutation contract) | `regala-architecture-contract` |
| Reproducing/diagnosing a live bug end-to-end | `regala-debugging-playbook` |
| Brutalist design tokens, `rg-*` classes, copy voice | `regala-docs-and-writing` + CLAUDE.md §8 |
| Expo / React Native / mobile app | no single mobile skill exists — mobile facts live in regala-run-and-operate (§3 Metro / app identity), regala-architecture-contract (§7), regala-config-and-env (`EXPO_PUBLIC_*`), regala-debugging-playbook (row 8 mobile currency) |
| Committing, migrating, deploying, editing CLAUDE.md | `regala-change-control` |

This skill is *mechanics only*. It never overrides the four non-negotiables
(zero-friction claims, migrations-only-via-MCP, never-commit-.env, design purity).

---

## Versions (verified 2026-07-12)

`next ^15.0.0`, `react ^18.3.1`, `zod ^4.4.3`, `@supabase/ssr ^0.5.0`. React is
**18**, not 19 — so `useActionState` comes from `react` (it moved out of
`react-dom`'s `useFormState` in 18.3). `next.config.ts` is minimal:
`transpilePackages: ['shared']` (this is how web consumes the raw-TS `shared`
workspace — do not add a build step to `shared`).

---

## Next.js 15 gotcha → fix (quick table)

| Symptom / error | Root cause | Fix |
|---|---|---|
| `Error: Route "…" used params… should be awaited` | In Next 15 `params` is a `Promise` | `const { id } = await params` |
| `cookies() … outside a request scope` / must await | `cookies()` from `next/headers` is async | server client already awaits it; always `await createServerSupabase()` |
| React error **#310** "rendered more hooks than expected" | `redirect()` called inside a `useActionState` action | return `{ redirectTo }`, navigate client-side in `useEffect` |
| **500** "Event handlers cannot be passed to Client Component props" | `onClick`/`confirm()` handler passed from a Server Component | extract a `'use client'` component (e.g. `delete-wishlist-button.tsx`) |
| Optional field rejected: "Invalid input" | Zod v4 `.optional()` rejects `null`; `formData.get()` returns `null` for absent fields | pass `formData.get('x') ?? undefined` |
| Price `66500` saved as `66.5` | `<input type=number>` + es-AR `.`=thousands | `type="text" inputMode="decimal"` + LATAM Zod transform |
| Gifter page stale after another user claims | `revalidate=0` is per-request freshness, not live push | known gap; see `regala-supabase-and-rls` realtime section |

---

## 1. `params` and `cookies` are Promises → `await`

**Symptom prevented:** build/runtime error `Route "/[username]/[slug]" used
params.username. params should be awaited before using its properties.`

In Next.js 15 App Router, dynamic route `params` (and `searchParams`) are
**Promises**. Type them as such and await:

```ts
// apps/web/app/[username]/[slug]/page.tsx (real)
type Props = { params: Promise<{ username: string; slug: string }> }
export default async function GifterPage({ params }: Props) {
  const { username, slug } = await params
  ...
}
```

`cookies()` from `next/headers` is likewise async. You never call it directly —
it is awaited once inside `createServerSupabase()` (next section) — but if you add
any `next/headers` call (`headers()`, `cookies()`) elsewhere, `await` it.

## 2. The Supabase server client is `async` → always `await createServerSupabase()`

**Symptom prevented:** `TypeError: supabase.auth.getUser is not a function`
(you got a Promise, not a client).

There is exactly ONE Supabase client in the web app and it is server-side.
`apps/web/lib/supabase/server.ts`:

```ts
export async function createServerSupabase() {
  const cookieStore = await cookies()          // async in Next 15
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { cookies: {...} })
}
```

So every call site is `const supabase = await createServerSupabase()`. There is
**no browser Supabase client** — client components reach the DB only by calling
Server Actions or hitting a route handler. (Why: architecture decision to keep
all Supabase access server-side; details in `regala-architecture-contract`.)

## 3. Server Action anatomy — the mutation contract

Every mutating Server Action follows the same five-step shape. Deviating from it
is how bugs get in. Copy-paste template:

```ts
'use server'
import { createServerSupabase } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const mySchema = z.object({
  title: z.string().min(1).max(200),
  note:  z.string().optional().transform(v => v || null),
})

export async function myAction(listId: string, formData: FormData) {
  // 1. AUTH GUARD — never trust the client
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()   // getUser, not getSession
  if (!user) redirect('/auth')

  // 2. OWNERSHIP CHECK — defence-in-depth on top of RLS
  const { data: ownedList } = await supabase
    .from('wishlists').select('id')
    .eq('id', listId).eq('owner_id', user.id).single()
  if (!ownedList) return                                     // silently no-op if not owner

  // 3. VALIDATE with safeParse (never .parse — no throw across the RSC boundary)
  const parsed = mySchema.safeParse({
    title: formData.get('title'),
    note:  formData.get('note') ?? undefined,                // ?? undefined — see §6
  })
  if (!parsed.success) return                                // or: return { error: parsed.error.issues[0].message }

  // 4. WRITE
  await supabase.from('items').insert({ wishlist_id: listId, ...parsed.data })

  // 5. REVALIDATE the pages that show this data
  revalidatePath(`/dashboard/${listId}`)
}
```

Real exemplars in `app/dashboard/actions.ts`: `addItem`, `editItem`,
`deleteItem`, `updateSurprise`, `updatePrivacy`, `deleteWishlist`,
`mergeWishlists`, `updateProfile`. All start with the `getUser()` guard; all
list-scoped ones re-check `owner_id = user.id`. `claimItem`
(`app/[username]/[slug]/actions.ts`) is the deliberate exception: **no auth guard**
(gifters must not sign up — non-negotiable #1), but it still re-checks the list is
`public`/`link_only` before inserting.

Two flavours of return type:
- **Fire-and-forget** actions called via `useTransition` / `<form action={...}>`
  return `void` and just `return` to no-op (`addItem`, `deleteItem`).
- **`useActionState` actions** return a state object (`{ error } | { redirectTo }
  | { success } | null`) — see §4. They must use `safeParse` and return the error,
  never throw.

## 4. `useActionState` signature + the NO-`redirect()`-inside-action rule

**Symptom prevented:** React error **#310** "rendered more hooks than expected"
(fixed in commit 4a5a675).

`useActionState` reducer signature is `(prevState, formData) => newState`. The
first parameter is the previous state — name it `_prevState` in the action:

```ts
export type CreateWishlistResult = { error: string } | { redirectTo: string } | null
export async function createWishlist(
  _prevState: CreateWishlistResult,      // prev state FIRST
  formData: FormData,
): Promise<CreateWishlistResult> { ... }
```

**Rule: do NOT call `redirect()` inside a `useActionState` action.** `redirect()`
throws a special `NEXT_REDIRECT` signal; thrown across the action→client state
transition it desyncs React's hook order → error #310. Instead **return a
`redirectTo` string** and navigate client-side:

```tsx
// apps/web/app/dashboard/new/page.tsx (real)
'use client'
const router = useRouter()                                   // from 'next/navigation'
const [state, action, pending] =
  useActionState<CreateWishlistResult, FormData>(createWishlist, null)

useEffect(() => {
  if (state && 'redirectTo' in state) router.push(state.redirectTo)
}, [state, router])
```

And in the action: `return { redirectTo: `/dashboard/${list.id}` }` — NOT
`redirect(...)`.

Nuance (do not misread): `redirect()` **is** fine inside an action when it is a
guard that aborts the whole request before any state is returned — e.g.
`if (!user) redirect('/auth')` at the top of `createWishlist`. It is also fine in
non-`useActionState` actions like `deleteWishlist` (called from a transition) and
in `handleAuth`/`updatePassword` on the *success* path, because those navigations
are not being threaded back through `useActionState`. The forbidden case is
specifically: returning to a `useActionState` hook AND redirecting on the same
success path. When in doubt, return `{ redirectTo }`.

`claim-button.tsx` shows the same pattern without navigation: it watches
`state?.success` in a `useEffect` and calls `onClaimed?.(itemId)` to update parent
stats — never redirecting.

## 5. No event handlers from a Server Component into a Client Component prop

**Symptom prevented:** **500** "Event handlers cannot be passed to Client
Component props" (fixed in commit 0fab824).

You cannot pass a function (`onClick`, `onConfirm`, a `confirm()` closure) as a
prop from a Server Component to a Client Component — functions are not
serializable across the boundary. If a rendered element needs an interactive
handler (a delete button with `confirm(...)`, an `onClick`), extract it into its
own `'use client'` component that owns the handler internally.

Real fix: `app/dashboard/[id]/delete-wishlist-button.tsx` is a `'use client'`
component that wraps the `deleteWishlist` action; the server page
(`app/dashboard/[id]/page.tsx`) just renders `<DeleteWishlistButton .../>` and
passes only serializable props (ids, strings), never the handler.

## 6. Zod v4: `null` vs `undefined` on `formData.get()`

**Symptom prevented:** every optional field failing with "Invalid input" (fixed
in commit 67c3fbe).

`formData.get('missing')` returns **`null`** (not `undefined`) when the field is
absent. In Zod v4, `.optional()` is `union(T, undefined)` — it accepts
`undefined` but **rejects `null`**. So an absent optional field throws "Invalid
input". Fix: coalesce to `undefined` at the `safeParse` boundary.

```ts
const parsed = createWishlistSchema.safeParse({
  title:    formData.get('title')    ?? undefined,   // required, still coalesce
  occasion: formData.get('occasion') ?? undefined,   // optional → MUST coalesce
})
```

Pattern seen in `createWishlist`. Note `addItem`/`editItem` pass
`formData.get(...)` **without** `?? undefined` — they get away with it because
each optional field's transform (`.optional().transform(v => v || null)`) and the
`z.coerce`/`z.string()` bases tolerate the incoming value in those specific
schemas. **Do not rely on that when adding a new field**: default to
`?? undefined` for optional fields. If you also collect a boolean checkbox, read
it as `formData.get('is_surprise') === 'on'` (see `createWishlist`).

## 7. `revalidate = 0` vs `revalidatePath(...)` — different tools

Do not confuse these:

- `export const revalidate = 0` (route segment config, as in
  `app/[username]/[slug]/page.tsx`) means **this page is never cached — re-fetch
  on every request**. It gives freshness *on load*. It does NOT push updates to an
  already-open tab (that is why the gifter view is stale after another user
  claims — a known gap, owned by `regala-supabase-and-rls`).
- `revalidatePath('/dashboard/…')` (called at the END of a mutation Action)
  **invalidates the server cache for that path** so the next navigation/render
  shows fresh data. Every mutation Action must call it for every path that
  displays the mutated data (e.g. `updateProfile` revalidates both `/dashboard`
  and `/dashboard/profile`).

Checklist when writing a mutation: did you `revalidatePath` **every** page that
renders this row? Missing one = stale UI after a successful write.

## 8. Middleware uses `getUser()` (not `getSession()`) + the matcher

`apps/web/middleware.ts` builds its own `createServerClient` from request cookies
and calls `supabase.auth.getUser()`. Use `getUser()`, not `getSession()`:
`getSession()` reads the (client-controllable) cookie without revalidating;
`getUser()` verifies the token against the Supabase auth server, which is what you
want for an auth gate.

Redirect rules:
- unauthenticated + path starts `/dashboard` → redirect to `/auth`
- authenticated + path is `/auth` → redirect to `/dashboard`

Matcher (only these paths run middleware):

```ts
export const config = { matcher: ['/dashboard/:path*', '/auth'] }
```

The public gifter route `/[username]/[slug]` is deliberately **not** matched — it
must be reachable by anon users (non-negotiable #1). Actions still re-check auth
themselves; middleware is a UX gate, not the security boundary.

## 9. `next/font` + CSS-variable wiring

Fonts are loaded once in `app/layout.tsx` via `next/font/google` and exposed as
CSS variables, then consumed by the design system's `rg-*` classes / CSS vars.

```tsx
// app/layout.tsx (real)
const archivoBlack = Archivo_Black({ subsets: ['latin'], weight: '400',
  variable: '--font-archivo-black', display: 'swap' })
// + Inter (--font-inter), JetBrains_Mono (--font-jetbrains-mono)
<html lang="es" className={`${archivoBlack.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
```

Gotchas: `Archivo_Black` needs an explicit `weight: '400'` (single-weight font).
`lang="es"` and `metadataBase: new URL('https://regala.me')` live here too. To use
a font, reference its CSS var (`font-family: var(--font-display)`), don't
re-import it. `globals.css` maps `--font-display` → Archivo Black etc.; the actual
`rg-*` class definitions are owned by the design docs (CLAUDE.md §8 /
`regala-docs-and-writing`) — cross-reference, don't duplicate.

## 10. Worked example: the LATAM price Zod transform

**Symptom prevented:** Argentine price `66.500` (= 66 500) saved as `66.5` (fixed
in commit 96df9e0). es-AR formats numbers with `.` as the **thousands** separator
and `,` as the **decimal** separator — the opposite of en-US. `<input
type="number">` parses `66.500` as `66.5`, so the form uses
`type="text" inputMode="decimal"` (see `add-item-form.tsx`) and normalizes inside
Zod. Real transform from `addItemSchema.price` in `app/dashboard/actions.ts`:

```ts
price: z.string().optional().transform(v => {
  if (!v) return null
  let s = v.trim().replace(/[^\d.,]/g, '')             // keep only digits, . and ,
  if (!s) return null
  const lastComma = s.lastIndexOf(',')
  const lastDot   = s.lastIndexOf('.')
  if (lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(',', '.')          // "1.234,56" → comma is decimal
  } else if (lastDot > -1 && lastComma === -1 && s.slice(lastDot + 1).length === 3) {
    s = s.replace(/\./g, '')                            // "66.500"  → dot is thousands
  } else if (lastComma > -1 && lastDot > lastComma) {
    s = s.replace(/,/g, '')                             // "1,234.56"→ comma is thousands
  }
  const n = Number(s)
  return isNaN(n) || n < 0 ? null : n
}),
```

Rules encoded: last comma after last dot ⇒ comma is decimal; only dots with a
final 3-digit group ⇒ dots are thousands; comma(s) then a later dot ⇒ commas are
thousands; anything non-numeric or negative ⇒ `null`. Mobile uses a cruder
`parseFloat(price.replace(/\./g,'').replace(',','.'))` — a known inconsistency,
not a bug to "fix" here.

Two related facts to know when touching items:
- `addItemSchema` defaults `priority` to **1**. The DB column default is **2** and
  mobile defaults to **2** — a real three-way inconsistency (1=OPCIONAL,
  2=ME GUSTA, 3=ESENCIAL). *CLAUDE.md is silent on the mismatch; verified 2026-07-12.*
- When you add a new item column you must touch FIVE code places or it silently drops:
  the `shared` row type (`packages/shared/src/types.ts`), the form field, the Zod schema,
  the `safeParse` object, and the `insert`/`update` object (the `image_url` field was lost
  once by missing the safeParse object — commit 96df9e0/445c703). Miss the `shared` type and
  it may typecheck clean yet never persist. This is the code slice of the full column
  touch-list — regala-change-control §5 owns the complete version (adds the migration and the
  CLAUDE.md §3 doc sync); use it as the authoritative checklist when adding a column.

---

## Fast repro / verify loop

```bash
pnpm install                     # required first in a fresh container
pnpm --filter web typecheck      # cheapest gate; tsc --noEmit, must be clean
pnpm dev:web                     # next dev --port 3000 (CLAUDE.md notes 3000 is often taken → use 3001)
```

To exercise a Server Action, drive the real form in the browser (a Server Action
is not directly curl-able without the RSC action id). To smoke-test the one
route handler that *is* curl-able: `/api/extract-product?url=…` — but it now
requires an authed session cookie (401 otherwise); see the extraction subsystem in
`regala-debugging-playbook`.

## Provenance and maintenance

All code quoted was re-read from the repo on **2026-07-12**:
`apps/web/app/dashboard/actions.ts`, `app/dashboard/[id]/add-item-form.tsx`,
`app/dashboard/new/page.tsx`, `app/[username]/[slug]/{page.tsx,claim-button.tsx,actions.ts}`,
`app/auth/actions.ts`, `middleware.ts`, `app/layout.tsx`, `next.config.ts`,
`lib/supabase/server.ts`. Commit hashes (4a5a675, 0fab824, 67c3fbe, 96df9e0,
445c703) come from the pre-verified dossier's failure archaeology, not re-run here
— treat them as pointers, confirm with `git log` if precision matters.

Re-verify volatile facts:
```bash
# versions (React must stay 18 for the useActionState-from-'react' import)
node -e "const p=require('./apps/web/package.json');console.log(p.dependencies.next,p.dependencies.react,p.dependencies.zod)"
# the redirect-in-action / useRouter pattern still present
grep -rn "redirectTo\|useRouter\|useActionState" apps/web/app/dashboard/new/page.tsx
# middleware still uses getUser + matcher
grep -n "getUser\|matcher" apps/web/middleware.ts
# server client still async + awaits cookies
grep -n "async function createServerSupabase\|await cookies" apps/web/lib/supabase/server.ts
```

If any grep comes back empty or the code diverges, **the repo wins** — update this
skill through `regala-change-control`, do not silently trust this doc.
