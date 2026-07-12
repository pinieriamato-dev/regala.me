---
name: regala-architecture-contract
description: >
  Read this BEFORE changing how regala.me's web app talks to the database, auth, or
  mutations — or before proposing any "quick fix" to security, claims, or privacy. It is the
  load-bearing-decisions map: WHY the web Supabase client is server-only, WHY RLS (not app code)
  is the security boundary, WHY there is a UNIQUE(item_id) on claims, and WHAT invariants must
  never break. Load it when you see: `createServerSupabase`, `@supabase/ssr`, `middleware.ts`,
  Server Actions in `app/dashboard/actions.ts` or `app/[username]/[slug]/actions.ts`,
  `privacy_level` / `is_public`, `transpilePackages: ['shared']`, error code `23505`, "double
  claim", "add a browser/client Supabase client", "bypass RLS", "why can't gifters see the list".
  Do NOT load it for step-by-step how-to (RLS policy SQL → regala-supabase-and-rls; Next.js route
  mechanics → regala-nextjs-app-router; the realtime project → regala-realtime-claims-campaign;
  editing CLAUDE.md/schema safely → regala-change-control).
---

# regala.me architecture contract

This skill records the **load-bearing design decisions** of the regala.me web app, each as
*decision → why → invariant*, plus the **invariants that must always hold** and the **open weak
points** stated plainly. It is a map, not a tutorial: it tells you what you are allowed to break
and what you are not. Read it before touching data access, auth, mutations, or the claim path.

New here? First read the four non-negotiables (below). They override convenience, "cleaner code",
and any suggestion in this file.

## The four non-negotiables (never violate; user-confirmed 2026-07-12)

1. **Zero-friction claims.** A gifter MUST NEVER be required to sign up or log in to claim a gift.
   The only required field to claim is `claimer_name` (text).
2. **Schema changes only via Supabase MCP migrations**, documented in CLAUDE.md §3 in the same
   change. No migration `.sql` files live in the repo. (Routed through `regala-change-control`.)
3. **Never commit `.env` / secrets.** Env files are git-ignored and the sandbox blocks writing
   them; they are created by hand with `printf`.
4. **Design-system purity (web):** brutalist — no blur, no radius beyond 4px, `rg-*` classes.
   (Owned by the design skills; listed here only so an "architecture cleanup" never quietly breaks it.)

---

## Load-bearing decisions

### 1. On web, Supabase is server-only; `createServerSupabase()` is async

**Decision.** The only Supabase client in the web app is created server-side, in
`apps/web/lib/supabase/server.ts`:

```ts
export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() {...}, setAll(...) {...} } }
  )
}
```

There is **no browser/client Supabase instance** and **no `NEXT_PUBLIC_` Supabase key** (they were
deliberately dropped, commit c097e16). Every read and write goes through a Server Component or a
Server Action. `middleware.ts` builds its *own* `createServerClient` from request cookies (it can't
call `cookies()` from `next/headers`) — same server-only pattern, different plumbing.

**Why.** Keeping the session in httpOnly cookies via `@supabase/ssr` (jargon: `@supabase/ssr` =
Supabase's cookie-based session helper for server frameworks) means tokens are never handed to
client JS, and there is exactly one code path to audit for auth. The publishable key still reaches
the server client, but RLS (decision 2) bounds what that key can do.

**Invariant.** `createServerSupabase()` is `async` — **always `await` it**. Never add a browser
Supabase client or a `NEXT_PUBLIC_SUPABASE_*` key without routing that architectural change through
change-control; it would move the security model and break the "one path to audit" property.
`cookies()` (from `next/headers`) is also async — always `await cookies()`.

### 2. RLS is THE security boundary; app-layer ownership checks are defence-in-depth

**Decision.** Row-Level Security (jargon: RLS = Postgres per-row access rules enforced by the
database, not the app) is enabled on all four public tables and is what actually protects data.
The Server Actions *also* re-check ownership before writing — e.g. every mutation in
`app/dashboard/actions.ts` does `getUser()` then, for item writes, confirms the parent list is owned:

```ts
const { data: ownedList } = await supabase
  .from('wishlists').select('id').eq('id', listId).eq('owner_id', user.id).single()
if (!ownedList) return
```

and updates carry redundant `.eq('owner_id', user.id)` / `.eq('wishlist_id', listId)` filters.

**Why.** If a bug ever exposed the server client or an action skipped a check, RLS still refuses the
row. The app checks exist to (a) fail fast with friendly Spanish errors and (b) narrow queries — not
because the app is trusted. Middleware uses `getUser()` (revalidates the token with Supabase), **not**
`getSession()` (which only reads the cookie), so a forged/expired cookie can't pass the gate.

**Invariant.** The database must remain the last line of defence: **never disable RLS, and never
treat an app-layer check as sufficient on its own.** Adding a new table means adding its RLS
policies in the same migration (change-control). App checks are additive, never a replacement.
Note: `claims` INSERT policy is intentionally `WITH CHECK true` for `{public}` (non-negotiable #1);
the security advisor flags it `rls_policy_always_true` — **that WARN is accepted, not a bug to fix.**

### 3. `privacy_level` replaced `is_public`; `link_only` currently equals `public` at the RLS layer

**Decision.** Wishlist visibility is a three-value text column `privacy_level ∈
{'public','link_only','private'}` (DB default `'public'`), enforced in the app by Zod
(`createWishlistSchema` in `app/dashboard/actions.ts`), **not** by a DB check constraint. The old
boolean `is_public` column was **removed** by migration `add_privacy_level_replace_is_public`.

**Why.** A binary public/private flag couldn't express "reachable by link but not listed in a
directory". `privacy_level` is the forward-compatible model.

**Invariant / current truth.** At the RLS layer, `public` and `link_only` are treated identically —
both are readable by anon. Every read filter uses `.in('privacy_level', ['public','link_only'])`
(gifter page `getListData`, `claimItem` action). `private` is owner-only. **`link_only` has no
functional teeth today** because the only thing that would distinguish it — a `/{username}` profile
directory that lists public-but-not-link_only lists — is not built (gap). Do not write code that
assumes `link_only` hides anything; today it does not.

**Stale-doc warnings.** CLAUDE.md §3 still lists `is_public BOOL default true` — **that column does
not exist; CLAUDE.md §3 is stale here.** Also `packages/shared/src/types.ts` still declares
`is_public: boolean` on the `Wishlist` interface (line 31) alongside `privacy_level` — a **phantom
field**: it type-checks but there is no such DB column, so never read/write `list.is_public`. Trust
the DB, not either declaration. (Correcting these is a change-control task, not something to do inline.)

### 4. One claim per item via `UNIQUE(item_id)` + `23505` mapping = the concurrency-safety invariant

**Decision.** The `claims` table has `UNIQUE(item_id)` (constraint `claims_item_id_unique`, migration
`add_unique_claim_per_item`). A second insert for the same `item_id` fails with Postgres error code
`23505` (unique_violation), which `claimItem` maps to a friendly message:

```ts
if (error.code === '23505') return { error: '¡Ya alguien lo reclamó! Elegí otro regalo.' }
```

**Why.** Two gifters can race to claim the same gift. The database — not the UI, not a read-then-check
in app code — is the only place that can atomically guarantee exactly one winner. This constraint is
the sole thing preventing a real double-claim (see open weak point: no realtime).

**Invariant.** **Never weaken or drop `UNIQUE(item_id)`**, and never move claim inserts to a
client-direct path that bypasses the `23505` handling in `claimItem`. Note this is `UNIQUE(item_id)`
— one claim per item, period — **not** `(item_id, claimer_name)` as TODOS.md once implied. Group
gifts (multiple contributors to one item) are **not** possible under this constraint today; enabling
them would require a schema change through change-control, and would remove the current double-claim
guard, so it is coupled to the realtime work.

### 5. Server Actions + Zod + `revalidatePath` are the only mutation path

**Decision.** Every write lives in a `'use server'` action file (`app/dashboard/actions.ts`,
`app/auth/actions.ts`, `app/[username]/[slug]/actions.ts`) and follows the same shape:
`getUser()` guard → (ownership check) → `zod.safeParse` → Supabase write → `revalidatePath(...)`.
`addItemSchema` and `createWishlistSchema` do all validation and LATAM number normalization in Zod
transforms.

**Why.** One shape means one place to audit, consistent validation, and cache correctness — an
un-revalidated write shows stale data. Zod at the boundary is where untrusted `FormData` becomes
typed data.

**Invariant.** No mutation may skip this pipeline. After any write, call `revalidatePath` for the
affected route(s). Two hard-won rules baked into these actions (do not "simplify" away):
- **`createWishlist` returns `{ redirectTo }` and does NOT call `redirect()`.** It runs under
  `useActionState`; calling `redirect()` there caused React error #310 (commit 4a5a675). The client
  navigates via `useRouter().push()`. `deleteWishlist`/`deleteItem` are *not* action-state actions and
  *do* call `redirect()`/return void — that's fine.
- **Optional `formData.get()` values get `?? undefined`** before Zod. Zod v4 `.optional()` rejects
  the `null` that `formData.get()` returns for absent fields (commit 67c3fbe).

### 6. The monorepo `shared` package is consumed as raw TypeScript via `transpilePackages`

**Decision.** `packages/shared` has **no build step**; its `main`/`types` point at `./src/index.ts`.
Web consumes it as raw TS because `apps/web/next.config.ts` sets `transpilePackages: ['shared']`, and
tsconfig maps the bare specifier `shared → ../../packages/shared/src/index.ts`. Import everywhere as
`import { ... } from 'shared'`.

**Why.** Avoids a build/watch step for a tiny types-and-helpers package; both apps always see the
current source.

**Invariant.** `shared` stays framework-free, side-effect-free, buildless. If you ever remove it from
`transpilePackages` or add a build, web imports break. `shared` is the **one home** for the DB row
types (`Profile`, `Wishlist`, `Item`, `Claim`) and helpers (`OCCASIONS`, `occasionEmoji`,
`daysUntil`, `createSlug`) — put shared types there, not duplicated in each app.

### 7. Mobile is a separate, pre-brutalist client sharing only the DB + `shared` types

**Decision.** `apps/mobile` (Expo/React Native) is its own client. It shares the same Supabase project
and the `shared` package — nothing else. It uses an AsyncStorage-backed browser-style client
(`lib/supabase.ts`, `detectSessionInUrl: false`), its own auth guard, and a **different, older color
palette** (coral `#E85D4A`, cream `#FDF6EC` in `constants/colors.ts`) that predates the web brutalist
redesign.

**Why.** Native and web have different session storage, navigation, and (historically) design. Coupling
them beyond the data layer buys nothing.

**Invariant.** The **database schema, RLS policies, and `shared` types are the only contract between
web and mobile.** A schema change must be validated against *both* clients. Do not import web-only code
(`@supabase/ssr`, `next/*`, `rg-*` CSS) into mobile or vice-versa. The web/mobile split is why the
inconsistencies in the next section exist — they are real and known, not accidental.

---

## Invariants checklist (things that must ALWAYS hold)

- [ ] Web: exactly one Supabase client, server-side; `createServerSupabase()` and `cookies()` are
      always `await`ed. No browser client, no `NEXT_PUBLIC_SUPABASE_*` key.
- [ ] RLS enabled on all four tables; app-layer ownership checks are additive, never a substitute.
      Middleware uses `getUser()`, not `getSession()`.
- [ ] A gifter never needs an account to claim; `claims` INSERT stays `WITH CHECK true` for `{public}`;
      the `rls_policy_always_true` advisor WARN stays accepted.
- [ ] `UNIQUE(item_id)` on `claims` is never weakened; `23505` is always mapped to the friendly error;
      claim inserts always go through the `claimItem` action.
- [ ] Every mutation follows `getUser` → (ownership) → Zod → write → `revalidatePath`. Optional
      form fields get `?? undefined`. `createWishlist` returns `{redirectTo}`, never calls `redirect()`.
- [ ] Visibility is `privacy_level` (never `is_public`); reads filter `.in(['public','link_only'])`;
      `private` is owner-only.
- [ ] `shared` stays buildless/framework-free and is the single home for DB row types and helpers.
- [ ] Schema/RLS is the only web↔mobile contract; changes are validated against both clients and go
      through change-control.

---

## Open weak points (stated plainly — do not paper over)

| # | Weak point | Reality today |
|---|---|---|
| 1 | **No realtime on the gifter view** | Page is `revalidate = 0` (fresh on load) but does NOT live-update. When gifter A claims, only A's browser updates (optimistic local state in `GifterItems` via `onClaimed`). Gifter B sees stale availability until reload and only learns they lost at submit time (the `23505` error). Correctness is safe (decision 4); the UX is not. This is the flagship problem — see `regala-realtime-claims-campaign`. |
| 2 | **`link_only` has no teeth** | Identical to `public` at the RLS layer; the distinguishing feature (a `/{username}` directory) isn't built. Don't rely on `link_only` to hide a list. |
| 3 | **`sort_order` inconsistency** | Web `addItem` uses DB `max(sort_order)+1`; mobile `add-item.tsx` uses `Date.now()`. Mobile-added items sort to the end on web. Known, low priority. |
| 4 | **Price-parse inconsistency** | Web normalizes LATAM formats in `addItemSchema` (handles `66.500` → 66500, `1.234,56` → 1234.56); mobile uses a cruder `parseFloat(price.replace(/\./g,'').replace(',','.'))`. Same input can yield different numbers per client. |
| 5 | **`priority` default is three-way inconsistent** | DB default `2`; web Zod `addItemSchema` defaults `1`; mobile defaults `2`. The value written depends on which client and whether the field was sent. (Semantics: 1=OPCIONAL, 2=ME GUSTA, 3=ESENCIAL.) |
| 6 | **`avatars` storage bucket unverified** | `app/api/upload-avatar/route.ts` uploads to a public `avatars` bucket, but its existence + upload policies were NOT confirmed on 2026-07-12 (MCP dropped mid-check). **Candidate, not fact** — re-verify before relying on avatar upload; if missing, the route 500s with "Revisá que el bucket exista…". |
| 7 | **Phantom `is_public` in types** | `shared/src/types.ts` `Wishlist.is_public` and CLAUDE.md §3 both reference a column that no longer exists. Don't read/write it. |

---

## When NOT to use this / use instead

- Need the **exact RLS policy SQL, constraints, or how to add/verify a policy** → `regala-supabase-and-rls`.
- Need **Next.js 15 route mechanics** (async params, Server Component vs Client boundary, `useActionState`
  wiring, the settled error-#310 / event-handler-prop bugs in depth) → `regala-nextjs-app-router`.
- Working the **realtime double-claim project** (enabling replication, wiring a subscription, the
  concurrent-claim experiment) → `regala-realtime-claims-campaign`.
- **Editing CLAUDE.md, applying a migration, or any schema/doc change** → `regala-change-control`.

This skill states the *why and the invariants*; the siblings own the *how*.

## Provenance and maintenance

Verified 2026-07-12 against the repo and the live Supabase project `esyybmnwalscpnzfeowh`. Where a
fact can drift, re-verify with:

- Server-only client shape: `cat apps/web/lib/supabase/server.ts` (async, no browser client) and
  `grep -rn "NEXT_PUBLIC_SUPABASE" apps/web` (must be empty).
- `transpilePackages`: `cat apps/web/next.config.ts`.
- Mutation pipeline + Zod defaults + LATAM price parse: `apps/web/app/dashboard/actions.ts`;
  claim/23505 + privacy filter: `apps/web/app/[username]/[slug]/actions.ts`.
- Privacy reads: `grep -rn "privacy_level" apps/web` (expect `.in([...'public','link_only'])`; no
  `is_public` in query code).
- `UNIQUE(item_id)` on claims (Supabase MCP `execute_sql`, SELECT only):
  `select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.claims'::regclass;`
- RLS policies: `select tablename, policyname, cmd, roles from pg_policies where schemaname='public';`
- Accepted advisor WARNs (should stay 3, all known): Supabase MCP `get_advisors type=security`.
- Phantom `is_public`: `grep -n is_public packages/shared/src/types.ts` (still present as of 2026-07-12).

Do not edit CLAUDE.md, apply migrations, or change settings from this skill — route those through
`regala-change-control`.
