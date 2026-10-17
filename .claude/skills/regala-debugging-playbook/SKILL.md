---
name: regala-debugging-playbook
description: >
  Symptom-to-fix triage for regala.me's KNOWN failure modes. Load this when something is broken and you
  need to find the cause fast: "every wishlist insert fails" / "column is_public does not exist", gifter
  page 404s on a valid public list, dashboard 500 "Event handlers cannot be passed to Client Component
  props", React error #310 ("rendered more hooks than during the previous render"), "Invalid input" on an
  OPTIONAL form field (Zod null), a price saved 1000x wrong (66500 -> 66.5), image_url never persists,
  mobile "add item" errors every time (currency column), a second claim on an item returning "¡Ya alguien
  lo reclamó!" (Postgres 23505), /api/extract-product returning null title/price, "Necesitás confirmar tu
  email" on signin, or avatar upload 500 "Revisá que el bucket exista". Covers files apps/web/app/dashboard/actions.ts,
  apps/web/app/[username]/[slug]/actions.ts, apps/web/middleware.ts, apps/web/app/api/extract-product/route.ts,
  apps/web/app/api/upload-avatar/route.ts, apps/mobile/app/add-item.tsx.
  Do NOT load for: writing NEW features from scratch (see the relevant subsystem skill); the full narrative
  chronicle of every past bug (use regala-failure-archaeology); how to run the diagnostic tools themselves
  (use regala-diagnostics-and-verification); deep Next.js App Router semantics (regala-nextjs-app-router);
  deep RLS/policy authoring (regala-supabase-and-rls).
---

# regala.me Debugging Playbook

**What this is:** a fast triage table from *observed symptom* to *most likely cause*, a *discriminating
check* to confirm it, and the *fix* — for the failure modes that have actually bitten this project. Read it
the moment something breaks. **Who should read it:** any engineer or model debugging regala.me who wants to
avoid re-deriving a trap that already cost someone a day.

Jargon defined once:
- **RLS** = Row-Level Security, Postgres per-row access rules; the security boundary in Supabase.
- **Server Action** = a `'use server'` async function in Next.js that runs on the server and is called from a form/client.
- **Zod** = the runtime schema/validation library used to parse `FormData` before DB writes.
- **`safeParse`** = Zod call returning `{success, data}` or `{success:false, error}` — it never throws.
- **anon** = an unauthenticated request (a gifter with no account), served with Supabase's public/anon role.

---

## 0. First move: isolate the LAYER before you guess

A regala.me bug lives in exactly one of four layers. Spend 2 minutes proving which before you touch code.

| Layer | Question | One-command probe | Points at |
|---|---|---|---|
| **DB / constraint** | Does the raw INSERT/UPDATE violate a column, FK, or UNIQUE? | Supabase MCP `execute_sql` running the literal insert, or read the Postgres error `code` (`23505`=unique, `23502`=not-null, `42703`=undefined column, `23503`=FK) | schema drift, unique violation |
| **RLS** | Owner sees the row but anon/gifter gets nothing? | Query the row *as the app sees it* — anon path has no `auth.uid()`. `select * from pg_policies where schemaname='public';` and reason about the USING clause | missing/too-strict policy |
| **Next.js** | Runtime 500 / hydration / hooks error, but data is fine? | `pnpm --filter web typecheck`, then read the server log line — the App Router error strings are literal and specific (see §2) | server/client boundary, params/cookies await, redirect-in-action |
| **Zod / parse** | Write silently no-ops or returns "Invalid/Datos inválidos"? | Temporarily log `parsed.error.issues` right after the `safeParse` call | `null` vs `undefined`, LATAM number format |

Rule of thumb: **a silent no-op** (action returns, nothing saved, no error toast) is almost always Zod
`safeParse` failing — several actions in `dashboard/actions.ts` do `if (!parsed.success) return` with NO
error surfaced (`addItem`, `editItem`, `deleteItem`). A **loud 500** is almost always Next.js. A **friendly
Spanish error** is a deliberately-handled DB/RLS case.

---

## 1. The symptom -> cause -> check -> fix table

Every row ends with the one-line **story** of when it bit us. All "FIXED" rows are *settled* — if you see the
symptom again it's a regression; the fix column tells you what the correct state looks like.

| # | Symptom | Likely cause | Discriminating check | Fix / correct state |
|---|---|---|---|---|
| 1 | **Every wishlist insert rejected**; Postgres `42703 column "is_public" does not exist` | Code inserts `is_public`, but the column was replaced by `privacy_level` (migration `add_privacy_level_replace_is_public`) | `execute_sql`: `select column_name from information_schema.columns where table_name='wishlists';` — there is NO `is_public` | Insert `privacy_level` (`'public'|'link_only'|'private'`), never `is_public`. See `createWishlist` in `dashboard/actions.ts` (inserts `privacy_level`, line ~82). **Story:** after the privacy migration, old insert code kept sending `is_public` and every create 500'd (fixed 9f523d0/67e5a57). **CLAUDE.md §3 is stale here** — it still lists `is_public BOOL`; the DB has `privacy_level` only. |
| 2 | **Gifter page 404 on a valid public list** (`regala.me/{username}/{slug}` -> `notFound()`) | The gifter route joins `profiles!inner(...)`; if anon can't SELECT `profiles`, the inner join yields null -> `.single()` null -> 404. Or the list's `privacy_level='private'`, or the slug is wrong | Curl the public URL logged-out; then `execute_sql`: `select id,slug,privacy_level,owner_id from wishlists where slug='<slug>';` and confirm policy `Profiles are publicly readable` exists in `pg_policies` | The `profiles_public_read` policy (SELECT, USING `true`, roles anon+authenticated) MUST exist. Gifter query filters `.in('privacy_level',['public','link_only'])` — `private` lists correctly 404 for anon. See `[username]/[slug]/page.tsx` line 18 (`profiles!inner(username, display_name)`). **Story:** every public list 404'd for gifters because the only profiles policy required `auth.uid()=id`; anon had no read (fixed 0fab824). |
| 3 | **Dashboard 500: "Event handlers cannot be passed to Client Component props"** | A Server Component passed an `onClick`/`confirm()` (a function) into a client component prop | Read the stack — it names the prop. Server Components can't serialize functions | Extract the interactive bit into a `'use client'` component (the project did this as `DeleteWishlistButton`). **Story:** the delete button put `onClick={() => confirm(...)}` in a server component and the dashboard 500'd (fixed 0fab824). See regala-nextjs-app-router for the boundary rules. |
| 4 | **React error #310** ("rendered more hooks than during the previous render") after a form submit | `redirect()` (from `next/navigation`) called INSIDE a `useActionState` action. `redirect` throws a control-flow signal that desyncs the hook order in the calling client component | Grep the action used by `useActionState`; if it calls `redirect()`, that's it | Return a plain value (`{ redirectTo: string }`) from the action and navigate client-side with `useRouter().push()` in a `useEffect`. Canonical example: `createWishlist` returns `{ redirectTo: \`/dashboard/${list.id}\` }` (line ~90) instead of redirecting. NOTE: `redirect('/auth')` for the *unauth guard* at the top of an action is fine — the #310 trap is redirect on the *success* path of a `useActionState` action. **Story:** create-list threw #310 until the redirect was replaced with returned `{redirectTo}` (fixed 4a5a675). |
| 5 | **"Invalid input" / "Datos inválidos" on an OPTIONAL field left blank** | Zod v4: `formData.get('x')` returns `null` for an absent field, but `.optional()` = `union(T, undefined)` — it accepts `undefined`, NOT `null`. `null` fails | Log `parsed.error.issues` — it names the field and says "Invalid input" | Coalesce every optional `formData.get()` with `?? undefined`. See `createWishlist`: `occasion: formData.get('occasion') ?? undefined` (line 61-65). **Story:** every list with a blank occasion/date failed to create until `?? undefined` was added (fixed 67c3fbe). |
| 6 | **Price saved 1000x wrong** — user types `66.500` (ARS $66,500) and DB stores `66.5` | es-AR uses `.` as *thousands* and `,` as *decimal*; a naive `type="number"` input or `Number("66.500")` reads it as 66.5 | Check DB `price` vs what the user typed; check the input is `type="text" inputMode="decimal"`, not `type="number"` | The web form parses in Zod: `addItemSchema.price` transform strips non-`[\d.,]`, then compares last comma vs last dot to decide separators (`dashboard/actions.ts` lines 21-40). Do NOT revert to `type="number"`. **Story:** prices came out divided by 1000 for every ARS item (fixed 96df9e0). ⚠️ Mobile `add-item.tsx` uses a cruder `parseFloat(price.replace(/\./g,'').replace(',','.'))` (line 36) — known rough edge, don't copy it to web. |
| 7 | **image_url never persists** — user pastes/extracts an image but the item has null `image_url` | The field is missing from the `safeParse({...})` object passed to Zod, so it's dropped before insert | Diff the `safeParse` keys in `addItem`/`editItem` against the form field names | `image_url` MUST appear in BOTH the `safeParse` input and the schema. See `addItem` `safeParse` includes `image_url: formData.get('image_url')` (line 202) and `addItemSchema.image_url` transform (lines 45-48). **Story:** the column, UI, and type all existed but `addItem` never read the field, so images silently vanished (fixed 96df9e0/445c703). **Lesson: adding a column requires touching form + Zod schema + safeParse input + insert + the `shared` type — five places.** |
| 8 | **Mobile "add item" errors every time**, `error.message` mentions an unknown/undefined column | Code inserted a `currency` field on `items` — but `currency` lives on `wishlists`, `items` has no such column | `execute_sql`: `select column_name from information_schema.columns where table_name='items';` — no `currency` | Do NOT insert `currency` into `items`. Current `apps/mobile/app/add-item.tsx` correctly omits it (insert at lines 32-40 has no `currency`, though the screen keeps a `currency` state var it never sends). **Story:** every mobile item-add 500'd because the insert included `currency` (fixed 67e5a57). If you see `currency` back in an `items` insert, that's the regression. |
| 9 | **Second person claims an item and gets "¡Ya alguien lo reclamó! Elegí otro regalo."** | This is **EXPECTED, not a bug.** `claims` has `UNIQUE(item_id)` (`claims_item_id_unique`) — one claim per item, period. The 2nd insert returns Postgres `23505` and the app maps it to the friendly message | Read `claimItem` in `[username]/[slug]/actions.ts` line 37: `if (error.code === '23505') return { error: '¡Ya alguien lo reclamó! Elegí otro regalo.' }` | Leave it. The UNIQUE + 23505 handling is the ONLY thing preventing a real double-claim (see §11 of the dossier / regala-failure-archaeology). Do NOT weaken the constraint to `(item_id, claimer_name)`; do NOT remove the 23505 branch. **Story:** two gifters racing the same gift is the designed-for case; correctness is enforced at the DB. ⚠️ TODOS/CLAUDE lore sometimes says the unique key is `(item_id, claimer_name)` — the SHIPPED constraint is `UNIQUE(item_id)`. |
| 10 | **/api/extract-product returns null title/price/image** for a real product URL | Not a code crash — a degradation. Causes: (a) MercadoLibre catalog `/p/` page needs ML OAuth creds and none are set; (b) Vercel datacenter IP is geo-blocked by ML; (c) the target serves a bot-block page whose only title is the site name (stripped to null) | Call the target API directly, bypassing auth: `curl -s https://api.mercadolibre.com/items/MLA<digits>`. If THAT returns data but the endpoint doesn't, it's creds/geo, not parsing | Set `ML_CLIENT_ID`/`ML_CLIENT_SECRET` (optional env; unset -> catalog pages degrade to a slug-derived Title Case title, price/image null). Generic OG/JSON-LD path still works for most sites. The client (`add-item-form.tsx`) only reports success if any of title/description/price/image_url is present, else an honest error. See regala-failure-archaeology for the full ML saga; this is PARTIAL/known-limited by design, not a break. |
| 11 | **Can't sign in: "Necesitás confirmar tu email antes de ingresar."** | The user's `auth.users.email_confirmed_at` is null — signin deliberately refuses unconfirmed accounts and calls `signOut()` | `execute_sql`: `select email, email_confirmed_at from auth.users where email='<email>';` | Working as intended (`auth/actions.ts` lines 86-89). User must click the confirmation link (`emailRedirectTo=${siteUrl}/auth/callback`). If confirmation mail never arrives, check Supabase Auth email settings — that's config, not app code. **Story:** unconfirmed users were being let in until this guard was added. |
| 12 | **Avatar upload 500: "No se pudo subir la imagen. Revisá que el bucket exista y tenga políticas de carga."** | The Supabase Storage bucket `avatars` is missing, or lacks an upload (INSERT) policy for authenticated users | The message IS the diagnosis. Verify: `execute_sql`: `select id, public from storage.buckets where id='avatars';` | Bucket `avatars` must exist (public) with an upload policy scoped to `${user.id}/...`. Upload path is `${user.id}/avatar.${ext}`, upsert, max 2MB, jpeg/png/webp/gif (`api/upload-avatar/route.ts` lines 4-31). ⚠️ **The bucket's existence is UNVERIFIED as of 2026-07-12 (dossier §3, candidate).** Confirm it before assuming avatar upload works. Creating the bucket is a schema/config change -> route through change-control (dossier §1.2), do not create it ad-hoc. |

---

## 2. Next.js App Router error-string cheat sheet (memorize the literals)

These 500/console strings map to exactly one cause in this repo:

| Error string (literal) | Cause | Fix |
|---|---|---|
| `Event handlers cannot be passed to Client Component props` | function prop from Server -> Client component | extract a `'use client'` component (row 3) |
| `Rendered more hooks than during the previous render` / React `#310` | `redirect()` on the success path inside a `useActionState` action | return `{redirectTo}`, push client-side (row 4) |
| `Invalid input` (from Zod) on a blank optional field | `null` from `formData.get()` hitting `.optional()` | `?? undefined` (row 5) |
| `cookies() ... should be awaited` / params type error | `cookies()` and route `params` are async/Promise in Next 15 | `await cookies()`, `const { id } = await params` |

`await`-related traps live in regala-nextjs-app-router; this table is just for pattern-matching a stack trace.

---

## 3. Three discriminating experiments

Use these to *prove* a hypothesis instead of guessing.

**A. RLS vs everything else — "query as anon."**
The gifter route hits Supabase with no `auth.uid()`. If the owner can see a row but the public URL 404s, it's
RLS. Prove it: read the policy USING clause and simulate the anon read.
```
# What policies govern the read?
execute_sql: select tablename, policyname, cmd, qual from pg_policies where schemaname='public' order by tablename;
# Is the list actually public and does the profile join resolve?
execute_sql: select w.slug, w.privacy_level, p.username from wishlists w join profiles p on p.id=w.owner_id where w.slug='<slug>';
```
If the row exists with `privacy_level in ('public','link_only')` and a username, but anon 404s -> a profiles/items/claims
SELECT policy is too strict (row 2).

**B. Zod vs DB — "log the parsed object."**
When a mutation silently no-ops, the culprit is almost always `safeParse` failing (many actions `return` with no
error). Temporarily add, right after the `safeParse` call:
```ts
if (!parsed.success) { console.error('ZOD FAIL', parsed.error.issues); return }
```
If `issues` fires -> parse/format problem (rows 5, 6). If it doesn't and the DB write still fails -> read the
Postgres `error.code` (row 1/8/9) — that's a constraint/column problem, a different layer.

**C. Concurrent-claim race — prove UNIQUE(item_id) holds.**
Fire two claim inserts for the same `item_id`; exactly one must succeed, the other must return `23505`.
```
execute_sql: insert into claims (item_id, claimer_name) values ('<item_uuid>','A');   -- succeeds
execute_sql: insert into claims (item_id, claimer_name) values ('<item_uuid>','B');   -- 23505 unique violation
```
(Read-only caution: these WRITE to the DB. Only run against a throwaway item, or in a branch — do NOT do this on
live data as part of "just debugging." For a non-mutating check, read the constraint:
`select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.claims'::regclass;`)

---

## 4. When NOT to use this / use instead

- **The full story of a past bug — the "why", the commits, the dead ends** -> `regala-failure-archaeology`.
- **How to run the tools** (Supabase MCP, advisors, typecheck, curl recipes, reproducing anon views) -> `regala-diagnostics-and-verification`.
- **Deep Next.js App Router rules** (server/client boundary, async params/cookies, `revalidate`, caching) -> `regala-nextjs-app-router`.
- **Authoring or reasoning about RLS policies and the schema** -> `regala-supabase-and-rls`.
- **Building a NEW feature** (not fixing a break) -> the relevant subsystem skill, not this one.

Do not use this playbook to *change* the four non-negotiables (dossier §1): zero-friction anon claims, schema
changes only via Supabase MCP migrations + CLAUDE.md update, never commit `.env`, brutalist design purity. If a
"fix" would touch schema or a policy, route it through change-control — don't apply it ad-hoc.

---

## 5. Provenance and maintenance

Verified 2026-07-12 against the repo and the live Supabase project (`esyybmnwalscpnzfeowh`). Line numbers are
from the files as read on that date; treat them as approximate if the files have since changed — the surrounding
identifiers (function names, error strings) are the durable anchors.

Re-verification one-liners (run from repo root `/home/user/regala.me`):
- Claim 23505 handling still present: `grep -n "23505" apps/web/app/[username]/[slug]/actions.ts`
- `is_public` truly gone / `privacy_level` present: `execute_sql: select column_name from information_schema.columns where table_name='wishlists' order by 1;`
- Claims unique constraint shape: `execute_sql: select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.claims'::regclass;`
- Optional-field `?? undefined` pattern intact: `grep -n "?? undefined" apps/web/app/dashboard/actions.ts`
- LATAM price transform intact: `grep -n "period is thousands" apps/web/app/dashboard/actions.ts`
- Avatar bucket exists (candidate, verify before relying): `execute_sql: select id, public from storage.buckets where id='avatars';`
- Cheapest overall gate: `pnpm install && pnpm --filter web typecheck`

Known CLAUDE.md drift referenced above (dossier §13): §3 still lists `is_public` (gone; use `privacy_level`) and
omits `profiles.bio`/`birthday`; claims uniqueness is `UNIQUE(item_id)` not `(item_id, claimer_name)`. State the
verified fact; do NOT edit CLAUDE.md except through change-control.
