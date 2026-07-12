---
name: regala-failure-archaeology
description: >
  The chronicle of settled bugs, dead ends, and reverts in regala.me. Load this BEFORE
  "fixing" anything that smells already-fought: wishlist inserts rejected / "column is_public
  does not exist", gifter page 404 on a valid public list, React error #310 "rendered more
  hooks than expected", dashboard 500 "Event handlers cannot be passed to Client Component
  props", "Invalid input" on optional form fields, price 66500 saved as 66.5, image_url never
  saved, mobile item add always errors, ML/MercadoLibre extraction returning nulls or only a
  slug title, the `rls_policy_always_true` advisor on claims, or any urge to "add auth to
  claims", "re-add is_public", "put currency on items", or "call redirect() from a server
  action". Also load when scoping realtime, mobile-brutalist, avatar upload, or link_only work
  to learn what is genuinely still OPEN. Do NOT load for a brand-new symptom with no prior art
  (use regala-debugging-playbook to triage first) or to learn WHY a rule exists
  (use regala-change-control).
---

One-line purpose: a symptom→root-cause→evidence(commit)→status ledger so no junior or
Sonnet-class model re-fights a battle that was already won (or already lost on purpose). Read
this the moment a bug "feels familiar" or before you propose a fix that touches claims, the
schema, extraction, or the useActionState flow.

How to read a row: **Symptom** is what you'd observe. **Root cause** is why. **Evidence** is the
real commit hash on `main` (run `git show <hash>` to read the actual diff). **Status** is
FIXED (settled, do not reopen), PARTIAL (works but degrades), or OPEN (not solved — do not
assume it is).

## When NOT to use this / use instead
- Brand-new symptom with no entry below → **regala-debugging-playbook** (triage from scratch).
- You want the *reasoning* behind the four non-negotiables or how to route a change → **regala-change-control**.
- You're evaluating a NEW idea's viability (not a past one) → **regala-research-methodology**.
- Deep mechanics of the extraction pipeline → **regala-product-extraction**. Next.js 15 gotcha
  mechanics in depth → **regala-nextjs-app-router**. This skill records the *history*; siblings own the *how*.

---

## 1. Settled battles — the ledger (all commits are real, on `main`)

Jargon, defined once: **RLS** = Postgres Row-Level Security (per-row access policies).
**Server Action** = a Next.js `'use server'` function that runs a mutation. **useActionState**
= a React hook that drives a form via a Server Action and holds its return value.
**Zod** = the runtime schema-validation library used to parse `formData`.

### Group A — Schema drift: the `is_public` → `privacy_level` migration fallout

| # | Symptom | Root cause | Evidence | Status |
|---|---------|-----------|----------|--------|
| A1 | **Every wishlist insert rejected** ("column is_public does not exist") | Migration `add_privacy_level_replace_is_public` dropped `is_public`; web action + mobile create-list still inserted it. | `9f523d0` (web+mobile), then `67e5a57` adds `privacy_level` to the insert + `Wishlist` type | FIXED |
| A2 | **Mobile-created lists invisible to gifters** | Mobile insert omitted `privacy_level` → row got NULL → NULL fails the gifter query `.in('privacy_level',['public','link_only'])`. | `67e5a57` (default `privacy_level='public'` on mobile insert) | FIXED |

Load-bearing lesson: **there is NO `is_public` column** (verified 2026-07-12). CLAUDE.md §3
still lists `is_public BOOL default true` — **CLAUDE.md §3 is stale here**; the DB truth is
`privacy_level text default 'public'` with values `{'public','link_only','private'}`. Confirm in
`apps/web/app/dashboard/actions.ts` (`privacy_level: z.enum([...]).default('public')`, line ~15).

### Group B — Next.js 15 App Router traps that bit this repo

| # | Symptom | Root cause | Evidence | Status |
|---|---------|-----------|----------|--------|
| B1 | **React error #310** "rendered more hooks than expected" on list create | `redirect()` was called *inside* a `useActionState` action, corrupting Next's action queue between server/client render. | `4a5a675` | FIXED |
| B2 | **Dashboard 500** "Event handlers cannot be passed to Client Component props" | A `confirm()` `onClick` lived in a Server Component. | `0fab824` (extracted `DeleteWishlistButton`, `'use client'`) | FIXED |
| B3 | **All optional form fields "Invalid input"** | `formData.get()` returns `null` for absent fields; Zod v4 `.optional()` is `union(T, undefined)` so `null` fails. | `67c3fbe` (append `?? undefined` on optional gets) | FIXED |
| B4 | **Gifter server component crashes (TypeError)** for OAuth users | `profiles!inner` join returns null when the signup trigger didn't fire for a Google user. | `67c3fbe` (optional chaining on profile access) | FIXED |

B1's fix is the current contract: `createWishlist` returns `{ error } | { redirectTo } | null`
(`CreateWishlistResult`, actions.ts line ~52; `return { redirectTo: \`/dashboard/${list.id}\` }`
line ~90). The client navigates in a `useEffect` — see `apps/web/app/dashboard/new/page.tsx`
lines 30-31 (`if (state && 'redirectTo' in state) router.push(state.redirectTo)`).

### Group C — RLS / access

| # | Symptom | Root cause | Evidence | Status |
|---|---------|-----------|----------|--------|
| C1 | **Gifter page 404 on a valid public list** | Anon gifters hit the page; the only `profiles` policy required `auth.uid()=id`, so the `profiles!inner` join returned nothing. | `0fab824` (migration `profiles_public_read`, SELECT USING `true`) | FIXED |

### Group D — Item fields, price, and mobile inserts

| # | Symptom | Root cause | Evidence | Status |
|---|---------|-----------|----------|--------|
| D1 | **Price "66.500" saved as 66.5** | `<input type="number">` reads es-AR thousands `.` as a decimal point. | `96df9e0` (switch to `type="text" inputMode="decimal"` + LATAM-aware parse in `addItemSchema`) | FIXED |
| D2 | **`image_url` never saved** | Field existed in schema + UI but was missing from the `addItem` `safeParse` object. | `96df9e0` / `445c703` | FIXED |
| D3 | **Mobile item add errored every time** | Insert included a `currency` field; `items` has no `currency` column (currency lives on `wishlists`). | `67e5a57` (removed from insert; picker kept for display only) | FIXED |
| D4 | **Extraction "success" with empty data** | UI marked success even when only the URL parsed. | `96df9e0` (only set extracted state when title/desc/price/image found; honest error otherwise) | FIXED |

Lesson from D2: **adding a column means touching four places** — the form field, the Zod
schema, the insert `safeParse` object, and the shared TS type. Miss one and the value silently
vanishes.

Open rough edge (not a bug to "fix" blindly): **priority default is three-way inconsistent** —
DB default `2`, web Zod default `1`, mobile default `2` (verified 2026-07-12). Semantics:
1=OPCIONAL, 2=ME GUSTA, 3=ESENCIAL. Changing any one without the others shifts what "default"
means; route it through **regala-change-control**.

### Group E — Mobile share URLs & dates

| # | Symptom | Root cause | Evidence | Status |
|---|---------|-----------|----------|--------|
| E1 | **Broken share URL** `regala.me/john/...` (email prefix) | URL built from `user.email.split('@')[0]` instead of the real `username`. | `67e5a57` (fetch `username` from `profiles`, fall back to `user.id`/`'user'`) | FIXED |
| E2 | **Year "24" formatted as "2224"** | `year.padStart(4, '2')` padded with the char `'2'`. | `67e5a57` — `apps/mobile/app/create-list.tsx:33` now `padStart(4, '0')` | FIXED |

### Group F — Auth overhaul (multi-commit)

| # | Symptom | Root cause | Evidence | Status |
|---|---------|-----------|----------|--------|
| F1 | **Google OAuth users stuck at `/auth/callback`** | Server-Action + `skipBrowserRedirect` approach never set the PKCE code-verifier cookie. | `67e5a57` (migrate to `GET /auth/google` route handler that sets the cookie before redirecting) | FIXED |
| F2 | **Captcha "Enter key" bypass** | Client-only captcha gate; Enter on a disabled button reached Supabase. | `445c703` (server-side captcha guard in `handleAuth`) | FIXED |
| F3 | **Unconfirmed emails could sign in** | No `email_confirmed_at` check. | `8cfc2e6` (web) + `67e5a57` (mobile) — `signOut()` + error if unconfirmed | FIXED |
| F4 | **OAuth redirect fell back to Site URL** (`/?code=...`) | `redirectTo` not in Supabase allowlist. | `e6f22a2` (safety-net redirect `/?code=` → `/auth/callback`, `app/page.tsx:82`) | FIXED |
| F5 | **Broken redirect from trailing slash** | `NEXT_PUBLIC_SITE_URL` had a trailing `/`. | `d1f499e` (strip it before building `redirectTo`) | FIXED |
| F6 | **Open redirect in callback** | `next` param validated by string-prefix, not origin. | `67e5a57` (validate against `origin`) | FIXED |

### Group G — Security hardening

| # | Symptom | Root cause | Evidence | Status |
|---|---------|-----------|----------|--------|
| G1 | **`/api/extract-product` was an open proxy (SSRF vector)** | No auth; anyone could make the server fetch arbitrary URLs. | `67e5a57` (require `getUser()`; 401 otherwise) — plus DNS-resolution private-host block + per-hop re-validation, see **regala-product-extraction** | FIXED |

---

## 2. The MercadoLibre (ML) extraction saga — a multi-round arc

This is one problem fought over four+ commits. It is **PARTIAL**, not FIXED — regular listings
work, catalog pages degrade. Do not "finish" it without reading **regala-product-extraction**.
Jargon: **catalog page** = an ML `/p/MLA…` product URL (aggregates sellers); **listing** = an
ML `/items/…` single-seller URL. **Client-credentials OAuth** = a server-to-server token with no
user, from `ML_CLIENT_ID`/`ML_CLIENT_SECRET`.

| Round | What was tried | Why it fell short | Evidence |
|-------|----------------|-------------------|----------|
| 1 | Use ML public REST API `api.mercadolibre.com/items/{ID}` for ML URLs instead of scraping HTML. | Works for **listings**. Catalog `/p/` IDs are not items → 404. | `55c845b` |
| 2 | Detect `/p/` path → call `/products/{id}` (+`/products/{id}/items?limit=1` for price). | `/products/` requires OAuth; unauthenticated calls fail. | `a0a43ae` |
| 3 | Stop the futile fetch: derive the title from the URL **slug** (`/estacion-carga…/p/MLA123` → Title Case), return immediately. | Vercel datacenter IPs are geo-blocked by ML catalog pages, so scraping was hopeless anyway. Title only, no price/image. | `799a205` |
| 4 | Add `getMLToken()` (module-level cache, ~6h TTL) using `ML_CLIENT_ID`/`ML_CLIENT_SECRET` client-credentials → real title+image+price for catalog. | Only works **if the creds env vars are set**. Absent/failing creds → still degrades to slug title. | `80fb4cc` |

**Net state (verified 2026-07-12):** listings → full extraction; catalog `/p/` → full only when
ML OAuth creds are present, else slug-derived title with null price/image. `ML_CLIENT_ID` /
`ML_CLIENT_SECRET` are real optional env vars (**CLAUDE.md §4 is stale** — it omits them). Do
not rip out the slug fallback; it is the graceful-degradation path, not dead code.

---

## 3. OPEN — do NOT assume solved

These are genuinely unfinished (verified 2026-07-12). Treat any claim that they "work" as false
until you re-verify.

- **No Supabase Realtime on the gifter view.** The page is `revalidate=0` (fresh on load) but does
  NOT live-update. When gifter A claims, only A's browser updates via optimistic local state
  (`onClaimed` in `GifterItems`). Gifter B sees stale availability until reload. Correctness is
  held ONLY by the DB `UNIQUE(item_id)` constraint + the `23505` → "¡Ya alguien lo reclamó! Elegí
  otro regalo." mapping (`apps/web/app/[username]/[slug]/actions.ts:37`). The UX gap (losing
  claimer learns only at submit) is the flagship hard problem — scope via change-control, not ad hoc.
- **Mobile is not on the brutalist design system.** `apps/mobile/constants/colors.ts` uses a
  pre-brutalist coral/cream palette (`#E85D4A` / `#FDF6EC`), unchanged. CLAUDE.md gap #2.
- **Avatar storage bucket `avatars` is UNVERIFIED.** Code path `app/api/upload-avatar/route.ts`
  uploads to a public `avatars` bucket, but a `storage.buckets` count returned empty on
  2026-07-12 (MCP dropped mid-check). If the bucket is missing, upload 500s with "Revisá que el
  bucket exista y tenga políticas de carga." **Verify before relying on it.**
- **`link_only` has no teeth.** At the RLS layer `link_only` behaves identically to `public`
  (both readable by anon). The only intended difference is directory listing, which isn't built —
  and there's no `/{username}` directory gating, so `link_only ≡ public` functionally.
- **`dashboard/new/page.tsx` design drift.** Uses raw Tailwind classes, not the `rg-*` system —
  a known style violator (CLAUDE.md gap #4). Do not imitate it as a pattern.
- **No image UPLOAD UI for items.** `items.image_url` is URL-only; there's no file picker (the
  avatar upload path is separate and its bucket is the unverified one above). CLAUDE.md gap #1.

---

## 4. Rejected approaches — DO NOT RETRY

Each of these was tried or explicitly ruled out. Re-proposing one wastes a cycle and, for the
first two, breaks a non-negotiable.

| Don't do | Why it's wrong | Do instead |
|----------|----------------|-----------|
| **Add auth to claims** to "fix" the `rls_policy_always_true` advisor | Violates non-negotiable #1: zero-friction claims. The `Anyone can claim` policy (INSERT, `{public}`, WITH CHECK `true`) is INTENTIONAL; the advisor WARN is known/accepted. | Leave it. Only `claimer_name` is required to claim. |
| **Re-add `is_public`** (column or in an insert) | It was deliberately removed (A1). Inserting it errors on every write. | Use `privacy_level` (`{'public','link_only','private'}`). |
| **Put a `currency` column on `items`** / insert `currency` into items | No such column; currency lives on `wishlists` (D3). Inserting it errors every mobile add. | Read currency from the parent wishlist. |
| **`redirect()` from a `useActionState` action** | Corrupts Next's action queue → React #310 (B1). | Return `{ redirectTo }` and `router.push()` in a client `useEffect`. |
| **Leave `/api/extract-product` open / call it without auth** | It was an SSRF open proxy (G1). | Keep the `getUser()` 401 guard + private-host DNS block. |
| **Scrape ML catalog HTML from Vercel** | Vercel IPs are geo-blocked by ML (round 3). | Use `/products/` API with ML OAuth creds, else the slug-title fallback. |

---

## Provenance and maintenance
(verified 2026-07-12 against the repo on `main` and the live Supabase project
`esyybmnwalscpnzfeowh`.) Every commit hash here was confirmed present via
`git log --oneline`. Re-verify the volatile pieces:

- Commit hashes still on history: `git show <hash> --stat` (e.g. `git show 9f523d0 --stat`).
- `is_public` really gone / `privacy_level` present: `grep -n "privacy_level\|is_public" apps/web/app/dashboard/actions.ts`.
- 23505 duplicate-claim mapping intact: `grep -n "23505" apps/web/app/[username]/[slug]/actions.ts`.
- Year padding fix intact: `grep -n "padStart(4" apps/mobile/app/create-list.tsx`.
- redirectTo (not redirect()) pattern intact: `grep -n "redirectTo" apps/web/app/dashboard/actions.ts apps/web/app/dashboard/new/page.tsx`.
- claims advisor still the accepted WARN: Supabase MCP `get_advisors type=security` (expect `rls_policy_always_true` on claims INSERT).
- Avatar bucket (the OPEN item): Supabase MCP `execute_sql` → `select id,public from storage.buckets where id='avatars';`.
- ML env vars still optional/undocumented in CLAUDE.md: `grep -n "ML_CLIENT" apps/web/app/api/extract-product/route.ts`.
