# regala.me — Full Codebase Audit Report

> Generated: 2026-06-01  
> Scope: All files across `apps/web`, `apps/mobile`, `packages/shared`  
> Skills applied: clean-code, file-organizer, frontend-design, impeccable, next-best-practices, next-cache-components, nodejs-best-practices, nodejs-backend-patterns, react-doctor, senior-backend, senior-architect, senior-frontend, supabase-postgres-best-practices, seo-expert, tailwind-patterns, typescript-advanced-types, ui-ux-pro-max, vercel-composition-patterns, vercel-react-best-practices, security-review, web-performance-optimization

---

## Severity Legend

- 🔴 **CRITICAL** — bug or security hole that could cause data loss, auth bypass, or broken core flow in production
- 🟠 **HIGH** — wrong behavior, meaningful performance issue, or security weakness
- 🟡 **MEDIUM** — code smell, missing best practice, degraded UX, or maintainability risk
- 🟢 **LOW** — polish, consistency, minor optimization

---

## 1. CRITICAL Bugs

### 1.1 Schema/Type Mismatch — `privacy_level` vs `is_public`

**Files:** `packages/shared/src/types.ts`, `apps/web/app/dashboard/page.tsx:13`, `apps/web/app/dashboard/actions.ts:18,31`, `apps/web/app/[username]/[slug]/page.tsx:21`

The shared `Wishlist` type defines `is_public: boolean` (no `privacy_level` field), but the web app queries and inserts a `privacy_level` column (values: `'public'` | `'link_only'` | `'private'`) in multiple places:

- `dashboard/page.tsx:13` — `select('...privacy_level')`
- `dashboard/actions.ts:18` — reads `formData.get('privacy_level')`
- `dashboard/actions.ts:31` — inserts `is_public: privacy_level !== 'private'`
- `gifter page.tsx:21` — `.in('privacy_level', ['public', 'link_only'])`

The DB schema was updated to add `privacy_level` but:

1. The shared `Wishlist` type was never updated → TypeScript does not catch mismatches
2. CLAUDE.md still documents only `is_public BOOL`
3. Mobile `create-list.tsx:38` still inserts `is_public: true` with no `privacy_level`

**Fix:** Add `privacy_level: 'public' | 'link_only' | 'private'` to the `Wishlist` type. Remove `is_public` or keep both consistent. Update mobile create-list to send `privacy_level`. Update CLAUDE.md.

---

### 1.2 `createWishlist` Never Writes `privacy_level` — All New Lists Invisible to Gifters

**Files:** `apps/web/app/dashboard/actions.ts:31`, `apps/web/app/[username]/[slug]/page.tsx:21`

`createWishlist` inserts `is_public: privacy_level !== 'private'` but **never inserts the `privacy_level` column**. Every list created via the web app gets `NULL` in the `privacy_level` column.

The gifter page queries:

```typescript
.in('privacy_level', ['public', 'link_only'])
```

`NULL` does not match this filter — Supabase/Postgres `.in()` uses `= ANY(...)` which does not match NULL. This means **every list created via the web dashboard is invisible to gifters**. The gifter view returns 404 for all of them.

**Fix:** Add `privacy_level` to the insert in `createWishlist`:

```typescript
.insert({ ..., is_public: privacy_level !== 'private', privacy_level })
```

---

### 1.3 Mobile `add-item.tsx` Inserts `currency` on `items` Table

**File:** `apps/mobile/app/add-item.tsx:39`

```typescript
const { error } = await supabase.from('items').insert({
  ...
  currency,   // ← items table has no currency column
  ...
})
```

The `items` schema has no `currency` column — it belongs to `wishlists`. This insert will fail with a Supabase error every time a user tries to add an item on mobile. The error is shown via `Alert.alert('Error', error.message)` so it is visible but the feature is broken.

**Fix:** Remove `currency` from the insert. Currency display comes from the parent wishlist.

---

### 1.4 No Unique Constraint on Claims — Double-Claim Bug

**Files:** `apps/web/app/[username]/[slug]/actions.ts`, `apps/web/app/[username]/[slug]/claim-button.tsx`

There is no `UNIQUE(item_id)` or `UNIQUE(item_id, claimer_name)` constraint on the `claims` table. A double-tap, slow connection reload, or concurrent requests will create duplicate claims, making the available count wrong. The `claimItem` server action does not check for an existing claim before inserting.

Already tracked in `TODOS.md` as P2 — but this is a correctness bug, not a deferred feature.

**Fix:** Apply `UNIQUE(item_id)` migration + handle the constraint violation in `claimItem` with a user-friendly message.

---

### 1.5 Mobile Year Padding Bug in Date Construction

**File:** `apps/mobile/app/create-list.tsx:33`

```typescript
const occasionDate =
  day && month && year
    ? `${year.padStart(4, "2")}-...` // ← pads with '2', not '0'
    : null;
```

Padding with `'2'` means a year like `'24'` becomes `'2224'` instead of `'2024'`. This creates invalid dates that silently produce wrong data in the DB.

**Fix:** Change to `year.padStart(4, '0')`.

---

### 1.6 Mobile Share Screen Uses Email Prefix as Username

**File:** `apps/mobile/app/share.tsx:18`

```typescript
const prefix = user?.email?.split("@")[0] ?? user?.id ?? "user";
const url = `https://regala.me/${prefix}/${slug}`;
```

The actual public URL is `regala.me/{username}/{slug}` where `username` comes from the `profiles` table, not from the email. These are not guaranteed to be the same. The share screen constructs and sends a broken URL via WhatsApp. This is a high-visibility bug — the primary share flow on mobile is broken.

**Fix:** Fetch `profiles.username` for the current user before constructing the URL (same pattern as `apps/web/app/dashboard/page.tsx:19`).

---

## 2. Security Issues

### 2.1 No Rate Limiting on `/api/extract-product`

**File:** `apps/web/app/api/extract-product/route.ts`

The endpoint makes an outbound HTTP request for every call with no rate limiting, no authentication required, and no per-IP throttling. An attacker can use it as an open proxy to exhaust Vercel function compute time and trigger outbound traffic at scale.

**Fix:** Add authentication check (require user session) or an API key. Add per-IP rate limiting via Vercel middleware or an edge function header check.

---

### 2.2 `claimItem` Accepts ANY `item_id` — Cross-List Claim Attack

**File:** `apps/web/app/[username]/[slug]/actions.ts`

`claimItem` reads `item_id` from formData and inserts it with zero validation. An attacker can POST any UUID — not just items from the currently-viewed list — to claim items from **any wishlist** in the database. Combined with no rate limiting, no captcha server-side enforcement, and no uniqueness check, this allows: (1) claiming all items on any list without visiting it, (2) spam-flooding the claims table, (3) making any list appear fully claimed.

**Fix:** Add hCaptcha server-side check, a `UNIQUE(item_id)` constraint, and validate that the item_id belongs to the public list being viewed before inserting.

---

### 2.3 Missing Input Validation in Dashboard Actions

**File:** `apps/web/app/dashboard/actions.ts`

`createWishlist` and `addItem` have no server-side Zod validation:

- `title` is read as a string with no min-length/max-length check — empty string or 10MB string are both accepted
- `price` is parsed with `Number(priceRaw)` — `NaN` if input is non-numeric, silently stored as `null`
- `url` is partially validated with a regex but no length limit

Auth actions use Zod schemas properly. Dashboard actions should do the same.

---

### 2.4 Mobile Login Has No Email Confirmation Check

**File:** `apps/mobile/app/(auth)/login.tsx:52-62`

```typescript
const { error: err } = isSignUp
  ? await supabase.auth.signUp({ email, password })
  : await supabase.auth.signInWithPassword({ email, password });
```

The web auth action (`apps/web/app/auth/actions.ts:94-97`) checks `data.user?.email_confirmed_at` and signs out unverified users. Mobile does no such check — a user with an unconfirmed email can log into the mobile app.

**Fix:** Add `email_confirmed_at` check after mobile signIn, same as web.

---

### 2.5 Mobile Signup Sends No `display_name`

**File:** `apps/mobile/app/(auth)/login.tsx:57`

```typescript
await supabase.auth.signUp({ email, password });
```

The web signup sends `data: { display_name: parsed.data.name }`. Mobile signup sends nothing. The `profiles` trigger may create a profile with a null `display_name`, causing missing names in the dashboard.

---

### 2.6 `claimItem` Has No Input Validation

**File:** `apps/web/app/[username]/[slug]/actions.ts`

```typescript
claimer_name: (formData.get('name') as string).trim(),
```

No length limit on `claimer_name`. A malicious user could insert a multi-MB string. No XSS risk at the DB level, but it wastes storage and can cause issues in rendering (e.g., very long names breaking UI layout).

**Fix:** Add `z.string().min(1).max(100)` validation.

---

### 2.7 `NEXT_PUBLIC_SITE_URL` Used Server-Side Only

**Files:** `apps/web/app/auth/actions.ts:46,68,107`, `apps/web/app/dashboard/[id]/page.tsx:43`

The `NEXT_PUBLIC_SITE_URL` env var is only read in server actions and server components — it is never accessed from the browser. Using `NEXT_PUBLIC_` needlessly exposes it to the client bundle and could cause confusion. When not set, it defaults to `'http://localhost:3001'` which would appear in signup confirmation emails in production if the env var is missing.

**Fix:** Rename to `SITE_URL` (no `NEXT_PUBLIC_` prefix). Update `.env.local` template in CLAUDE.md.

---

### 2.8 Empty Catch Block Swallows Cookie Errors

**File:** `apps/web/lib/supabase/server.ts:17-20`

```typescript
try {
  cookiesToSet.forEach(({ name, value, options }) =>
    cookieStore.set(name, value, options as any),
  );
} catch {}
```

Silent failure on cookie write. In Server Components the cookie store is read-only and throws — the empty catch is intentional for that case. However, there is no distinction between expected read-only errors and unexpected errors. At minimum the catch should scope to `ReadonlyRequestCookiesError`.

---

### 2.9 Open Redirect Bypass via URL-Encoded Slashes

**File:** `apps/web/app/auth/callback/route.ts:11-13`

```typescript
const next =
  rawNext.startsWith("/") &&
  !rawNext.startsWith("//") &&
  !rawNext.startsWith("/\\")
    ? rawNext
    : "/dashboard";
```

This blocks `//evil.com` and `/\evil.com` but `NextRequest.nextUrl.searchParams.get('next')` returns pre-decoded values — so `/%2Fevil.com` (URL-encoded slash) is decoded to `//evil.com` **before** this check runs, bypassing the guard. Replace with `new URL(rawNext, origin)` and verify `url.origin === origin`.

### 2.10 Raw Supabase Error Messages Leaked to Unauthenticated Users

**File:** `apps/web/app/[username]/[slug]/actions.ts:13`

```typescript
if (error) return { error: error.message };
```

Supabase error messages can contain table names, column names, and constraint names — exposed directly to anonymous gifters. Map to a generic message: `'No se pudo reclamar el regalo. Intentá de nuevo.'`

---

## 3. Performance Issues

### 3.1 N+1 Queries in Mobile Lists Screen (3N Round Trips)

**File:** `apps/mobile/app/(tabs)/index.tsx:43-62`

For each wishlist, three DB queries run per list:

1. `items.select('id', { count: 'exact', head: true })` — count only (HEAD)
2. `items.select('id')` — full item IDs (redundant with #1 — `itemIds.length === itemCount`)
3. `claims.select(...)` — claim count using item IDs from #2

Query #1 is entirely redundant (delete it immediately — cheap win). The overall pattern causes **O(3n) round trips** for n lists. A user with 10 lists triggers 30+ DB queries on every screen load.

**Fix:** Delete the redundant first items query and replace the entire fan-out with two batch queries after the initial wishlists fetch — the same pattern `apps/web/app/dashboard/page.tsx` already uses correctly.

---

### 3.2 Sequential DB Queries in Dashboard

**File:** `apps/web/app/dashboard/page.tsx:8-38`

Three queries run sequentially:

1. wishlists query
2. items query (depends on wishlist IDs from step 1)
3. claims query (depends on item IDs from step 2)

Steps 1→2→3 are legitimately sequential (each depends on the prior). However, steps 1 and 2 could be combined with a join, eliminating one round trip.

**Fix:** `select('*, items(id, wishlist_id, claims(item_id))')` on wishlists to collapse 3 queries to 1.

---

### 3.3 Sequential DB Queries in Gifter Page

**File:** `apps/web/app/[username]/[slug]/page.tsx:26-33`

items and claims fetches are sequential — claims depends on items IDs, so they cannot be truly parallelized. However, using a single join select would eliminate one round trip:

```typescript
.select('*, items(*, claims(item_id))')
```

---

### 3.4 No Caching on `/api/extract-product`

**File:** `apps/web/app/api/extract-product/route.ts`

The endpoint fetches external URLs with no response caching. If two users paste the same MercadoLibre URL, two outbound fetches are made. Even a simple in-memory LRU cache keyed by URL would help, or using Next.js's `fetch` cache with `revalidate`.

**Fix:** Add `cache: 'force-cache'` to the inner fetch or use `unstable_cache` from Next.js.

---

### 3.5 `revalidate = 0` on Gifter Page

**File:** `apps/web/app/[username]/[slug]/page.tsx:8`

`export const revalidate = 0` forces a fresh DB fetch on every request. For a page that is publicly shared via WhatsApp, this means every link preview and every open re-queries the DB. Consider:

- `revalidate = 30` (30s stale-while-revalidate) for the page itself
- Pair with `revalidatePath()` calls when claims are inserted to invalidate on-demand

---

### 3.6 No Suspense Boundaries or `loading.tsx` Files

**Files:** All route directories in `apps/web/app/`

No `loading.tsx` files exist anywhere. With `revalidate = 0` and sequential fetches, users see no progressive loading. Adding Suspense boundaries and loading skeletons would improve perceived performance.

---

### 3.6 No `loading.tsx` or `error.tsx` in Any Route Segment

**Files:** All `apps/web/app/` route segments

No `loading.tsx` or `error.tsx` exists anywhere. Without `loading.tsx`, all server-side async work blocks before any HTML is sent — on slow LATAM mobile connections this produces a noticeable blank screen. Without `error.tsx`, an unhandled server error on the gifter view shows an unbranded Next.js error page to someone who followed a WhatsApp link — a poor first impression at the most critical viral moment.

---

### 3.7 Three Google Fonts Loaded Simultaneously

**File:** `apps/web/app/layout.tsx:2-22`

Three Google Fonts (Archivo Black, Inter, JetBrains Mono) are loaded at the root layout level for every page — including the landing page that uses all three, but also the gifter page where only two are actively used.

`display: 'swap'` is used correctly, which prevents render-blocking. No critical issue, but monitor Web Font LCP impact.

---

### 3.8 No Next.js `<Image>` Used for Product Images

**Files:** `apps/web/app/dashboard/[id]/page.tsx`, `apps/web/app/[username]/[slug]/gifter-items.tsx`

`image_url` exists in the `items` schema but is never rendered. When it eventually is rendered, use `next/image` with `sizes` for automatic optimization.

---

### 3.9 `* { scrollbar-width: none }` Global Rule

**File:** `apps/web/app/globals.css:200-201`

```css
* {
  scrollbar-width: none;
}
*::-webkit-scrollbar {
  display: none;
}
```

This removes scrollbars from **every scrollable element** globally, including the main page body. On non-touch desktop devices this removes the only visual affordance for scrollability. Scope this to specific elements (e.g., the marquee track, horizontal chip selectors) rather than applying globally.

---

## 4. Architecture Issues

### 4.1 Redundant Auth Checks — Middleware + Layout + Page

**Files:** `apps/web/middleware.ts`, `apps/web/app/dashboard/layout.tsx:5-8`, `apps/web/app/dashboard/page.tsx:9-11`

Auth is checked in three layers:

1. Middleware — redirects unauthenticated users - new next.js versions prefer proxy over middleware;
2. Dashboard layout — calls `getUser()` to get display name (fine)
3. Dashboard pages — call `getUser()` again and redirect if no user (redundant with middleware)

The page-level `if (!user) redirect('/auth')` guards are redundant since middleware handles this. They add extra Supabase calls per request. The layout call is necessary for the display name — but pages should trust that middleware already filtered unauthenticated requests.

**Fix:** Remove `if (!user) redirect('/auth')` from individual pages. Keep layout's getUser for display name.

---

### 4.2 `createWishlist` Throws Unhandled Errors

**File:** `apps/web/app/dashboard/actions.ts:37`

```typescript
if (error) throw new Error(error.message);
```

This throws a raw error from a Server Action. In Next.js, unhandled errors in Server Actions cause a generic error UI. The form in `dashboard/new/page.tsx` uses `useTransition` but not `useActionState` — there's no error feedback mechanism. The user sees the transition finish with no action taken and no error message.

**Fix:** Use `useActionState` in `new/page.tsx` and return `{ error: string }` from the action instead of throwing.

---

### 4.3 `addItem` Silently Returns on Auth/Ownership Failure

**File:** `apps/web/app/dashboard/actions.ts:61`

```typescript
if (!ownedList) return;
```

If the ownership check fails, the action silently returns `undefined`. The form in `add-item-form.tsx` uses `useTransition` but cannot distinguish between success and silent failure. The user sees the form reset (on success path) or... nothing on failure.

---

### 4.4 No Supabase TypeScript Types Generated

**Files:** All query files

The codebase manually maintains types in `packages/shared/src/types.ts`. Supabase can generate TypeScript types directly from the schema with `supabase gen types typescript`. The manual types are already out of sync (`privacy_level` issue, `currency` on items). Generated types would prevent this class of bug.

**Fix:** Add a `pnpm typecheck:db` script that runs `supabase gen types typescript --project-id esyybmnwalscpnzfeowh > packages/shared/src/database.types.ts` and use those types in queries.

---

### 4.5 `sort_order` Race Condition

**File:** `apps/web/app/dashboard/actions.ts:72-79`

```typescript
const { data: topItem } = await supabase
  .from("items")
  .select("sort_order")
  .eq("wishlist_id", listId)
  .order("sort_order", { ascending: false })
  .limit(1)
  .single();
const sort_order = (topItem?.sort_order ?? -1) + 1;
```

Two concurrent inserts could both read the same `MAX(sort_order)` and produce duplicate sort orders. Not a critical issue (duplicates would show in insertion order), but a `DEFAULT` serial or `SERIAL` column would be cleaner.

---

### 4.6 Slug Not Guaranteed Unique

**File:** `packages/shared/src/index.ts:27-40`

```typescript
return title.slug + "-" + Date.now().toString(36);
```

`Date.now()` resolves to milliseconds — two lists created within the same millisecond get the same slug. Extremely unlikely but possible. A uuidv4 suffix or a DB unique constraint on `(owner_id, slug)` would close this.

---

### 4.7 `deleteItem` Has Authorization Gap

**File:** `apps/web/app/dashboard/actions.ts:94-106`

The action verifies ownership via `ownedList` check before deleting — this is correct. However, there's no check that the `itemId` actually belongs to `listId` before deleting. The delete is:

```typescript
await supabase
  .from("items")
  .delete()
  .eq("id", itemId)
  .eq("wishlist_id", listId);
```

The `wishlist_id` filter prevents cross-list deletion. The RLS should also catch this. Pattern is acceptable.

---

### 4.8 Extra `getUser` Call on Every Gifter Page — Including Anonymous Visitors

**File:** `apps/web/app/[username]/[slug]/page.tsx:64`

```typescript
const supabase = await createServerSupabase();
const {
  data: { user },
} = await supabase.auth.getUser();
```

This is called in `GifterPage` to determine `isOwnerSurpriseView`. Most visitors to the gifter page are anonymous gifters — not the list owner — yet a Supabase Auth round-trip fires for every single request. The `getListData` cache already creates its own Supabase client. Two clients + one extra Auth call on the hottest unauthenticated route.

**Fix:** Pass the owner_id from the list data and compare with the session only when needed, or check `user?.id === list.owner_id` without a full extra `createServerSupabase()` call.

---

### 4.9 `deleteWishlist` and `deleteItem` Discard DB Errors — False Success UX

**File:** `apps/web/app/dashboard/actions.ts:48,103`

Both delete actions discard the Supabase result entirely and always call `revalidatePath` + `redirect`, giving the user the impression of success even when the DB delete failed.

---

### 4.10 Mobile App Has No Privacy Level Support

**File:** `apps/mobile/app/create-list.tsx:38`

```typescript
.insert({ ..., is_public: true })
```

Mobile always creates public lists. The privacy level feature (`public | link_only | private`) built for web is completely absent on mobile. Lists created from mobile cannot be set to link-only or private.

---

## 5. React / Frontend Issues

### 5.1 Dead Prop: `listIsSurprise` in `ClaimButton`

**File:** `apps/web/app/[username]/[slug]/claim-button.tsx:6`

```typescript
export default function ClaimButton({ itemId }: { itemId: string; listIsSurprise: boolean }) {
```

`listIsSurprise` is declared in the props type but never used inside the component. The prop is passed from `gifter-items.tsx:104` but does nothing.

---

### 5.2 `key={i}` Anti-Pattern

**File:** `apps/web/app/page.tsx:229,251`

```typescript
{TESTIMONIALS.map((t, i) => <div key={i} ...>)}
{FAQS.map((f, i) => <div key={i} ...>)}
```

Both use array index as key. Since these are static arrays that never reorder, this is not a runtime bug — but it's a code smell. Use stable keys from the content.

---

### 5.3 Duplicate Nav Markup (3 Variations)

**Files:** `apps/web/app/auth/AuthForm.tsx:72-84`, `apps/web/app/auth/reset-password/ResetPasswordForm.tsx:11-23`, `apps/web/app/[username]/[slug]/page.tsx:82-92`

Three separate nav bars, all slightly different copies of the same structure. None use `<nav>` HTML element semantics. Should be extracted to a shared `<BrandNav>` component.

---

### 5.4 `Logomark` Defined Inside Page Module

**File:** `apps/web/app/page.tsx:57-69`

The `Logomark` component is defined inside `page.tsx` but is also duplicated as inline markup in `dashboard/layout.tsx:19-26` and `gifter page.tsx:87`. Should be extracted to `components/Logomark.tsx`.

---

### 5.5 `ResetPasswordPage` Unnecessary Double Wrapper

**File:** `apps/web/app/auth/reset-password/page.tsx`

```typescript
'use client'
const ResetPasswordForm = dynamic(() => import('./ResetPasswordForm'), { ssr: false })
export default function ResetPasswordPage() { return <ResetPasswordForm /> }
```

The outer page is already `'use client'`. Wrapping the inner form in `dynamic(..., { ssr: false })` is redundant — a client component already doesn't SSR. The `'use client'` on `ResetPasswordForm.tsx` itself also means it wouldn't SSR. Remove the dynamic import wrapper.

---

### 5.6 Mobile Login Has Duplicate Password TextInput

**File:** `apps/mobile/app/(auth)/login.tsx:112-131`

Both the `isSignUp=true` and `isSignUp=false` branches render an identical `TextInput` for password. The two branches should share the same input element.

---

### 5.7 `AuthForm` Mode Sync via `useEffect` Is Unnecessary

**File:** `apps/web/app/auth/AuthForm.tsx:39-41`

```typescript
useEffect(() => {
  setMode(params.get("mode") === "signup" ? "signup" : "signin");
}, [params]);
```

This effect exists to sync `mode` state with URL params. But mode is already initialized from params on mount (line 17-18). The effect would only re-run if `params` changes after mount — which only happens with navigation to a different URL, at which point the component remounts anyway. This effect is effectively dead code.

---

### 5.8 Large `AuthForm` Component

**File:** `apps/web/app/auth/AuthForm.tsx`

At 300 lines, `AuthForm` handles three distinct UI modes (signin, signup, forgot) in a single component with branching JSX. Each mode could be a focused sub-component (`<SignInForm>`, `<SignUpForm>`, `<ForgotForm>`) composed by a thin `<AuthForm mode={mode}>` wrapper.

---

### 5.9 No Error Boundaries

**Files:** All web app routes

No React error boundaries exist. An unhandled error in any client component will crash the entire page to a blank screen or Next.js error overlay in production.

---

### 5.10 `OccasionId | 'personal' | ''` Type Mixing

**File:** `apps/web/app/dashboard/new/page.tsx:21`

```typescript
const [occasion, setOccasion] = useState<OccasionId | "personal" | "">("");
```

`''` (empty string) is mixed into a domain type as a UI sentinel. Better pattern: `const [occasion, setOccasion] = useState<OccasionId | 'personal' | null>(null)`.

---

### 5.11 `(e.target as HTMLInputElement)` — Not Used Consistently

**File:** `apps/web/app/dashboard/[id]/add-item-form.tsx:97`

Uses `React.ChangeEvent<HTMLInputElement>` typed properly — good. However, other form interactions bypass this pattern.

---

## 6. TypeScript Issues

### 6.1 `as unknown as` Double Cast

**File:** `apps/web/app/dashboard/[id]/page.tsx:42`

```typescript
const username = (list.profiles as unknown as { username: string }).username;
```

This double cast bypasses TypeScript completely. Root cause: Supabase query returns untyped join result. Fix: use generated Supabase types or type the select result explicitly.

---

### 6.2 Multiple `as any` Casts in Supabase Client Setup

**Files:** `apps/web/middleware.ts:21`, `apps/web/lib/supabase/server.ts:19`

```typescript
supabaseResponse.cookies.set(name, value, options as any);
cookieStore.set(name, value, options as any);
```

These are `@supabase/ssr` type compatibility workarounds. Acceptable short-term but should be addressed when upgrading `@supabase/ssr`.

---

### 6.3 `width: \`${progress \* 100}%\` as any` in Mobile

**Files:** `apps/mobile/app/(tabs)/index.tsx:117`, `apps/mobile/app/list/[id].tsx:67`

React Native's `width` style accepts number (pixels) or string percentage. TypeScript doesn't allow template literals here without the cast. The correct typing is using `\`${number}%\`` or just `as `${number}%``but neither works well. Better: compute the ratio as a number:`width: progress \* 100 + '%' as any`is acceptable short-term. Or use a`View`with`flex` approach instead.

---

### 6.4 Shared `Wishlist` Type Missing `privacy_level`

**File:** `packages/shared/src/types.ts:21-33`

See §1.1. `privacy_level: 'public' | 'link_only' | 'private'` must be added to `Wishlist`.

---

### 6.5 `Claim` Type Has Unused Fields

**File:** `packages/shared/src/types.ts:48-56`

`claimer_phone`, `is_group_gift`, `contribution_amount` are in the `Claim` type but never used in any UI. The TODOS reference group gifts as P3. Until implemented, these fields are dead weight in the type.

---

## 7. SEO Issues

### 7.1 No `og:image` — Critical for WhatsApp Sharing

**Files:** `apps/web/app/layout.tsx:24-27`, `apps/web/app/[username]/[slug]/page.tsx:42-58`

`og:image` is absent from both root layout metadata and the gifter page metadata. WhatsApp link previews require `og:image` to show a card. The primary sharing channel is WhatsApp. This is the highest-impact SEO/marketing gap. Already tracked in `TODOS.md` as P2.

---

### 7.2 No `robots.txt`, `sitemap.xml`, or `public/` Directory

**Files:** `apps/web/` — no `public/` folder exists at all

There is no `public/` directory in `apps/web/`. No `robots.txt`, no sitemap, no `favicon.ico`. Crawlers have no guidance on what to index or exclude. Dashboard and auth routes should be blocked; gifter pages should be indexed.

**Fix:** Add `apps/web/app/robots.ts`, `apps/web/app/sitemap.ts`, and `apps/web/app/favicon.ico` using Next.js App Router metadata routes (no `public/` dir required).

---

### 7.3 No `metadataBase` — All Relative OG URLs Will Fail

**File:** `apps/web/app/layout.tsx:24-27`

No `metadataBase: new URL('https://regala.me')` is set in the root metadata. Without it Next.js cannot resolve relative `og:image` URLs — they will be missing or broken. This is a **one-line fix** that is prerequisite for `og:image` to work at all.

---

### 7.4 No Structured Data (JSON-LD)

**Files:** `apps/web/app/[username]/[slug]/page.tsx`

Public gifter pages could have `Event` schema (when `occasion_date` is set) and `ItemList` for the gifts. This enables rich results in Google.

---

### 7.5 No `twitter:card` Meta Tags

No `twitter` key in any `metadata` export. Links shared on X or via iMessage show as plain text links.

---

### 7.6 No Canonical URL

No `metadataBase` (see §7.3) means no canonical URLs. Duplicate content between `http`/`https` or trailing-slash variants could cause indexing issues.

---

### 7.7 FAQ Section Hidden on Mobile — Broken "See All" CTA

**File:** `apps/web/app/page.tsx:252,261`

FAQs 4-6 are `hidden md:block` on mobile. The "VER TODAS LAS PREGUNTAS" button at line 261 links to `href="#"` — clicking it scrolls to the top and does nothing. Three key FAQs ("¿Funciona en Argentina?", "¿Lista privada?", surprise mode) are completely inaccessible on mobile.

---

### 7.8 Auth Page Has No Page-Level Metadata

**File:** `apps/web/app/auth/page.tsx`

No `metadata` export. Browser tab shows the root layout title "regala.me — Tu lista de regalos..." for the login page. Should export `{ title: 'Ingresar — regala.me' }`.

---

## 8. UI/UX Issues

### 8.1 Delete Wishlist Uses `confirm()` Dialog

**File:** `apps/web/app/dashboard/[id]/page.tsx:75`

```typescript
onClick={(e) => { if (!confirm('¿Eliminar esta lista?')) e.preventDefault() }}
```

Browser `confirm()` is blocked in embedded contexts (iframes, some PWAs), looks inconsistent across browsers, and is considered poor UX. Replace with an inline confirmation UI or a modal.

---

### 8.2 No Error Feedback on Wishlist Creation Failure

**File:** `apps/web/app/dashboard/new/page.tsx:26-33`

`createWishlist` throws on DB error. The form uses `useTransition` but not `useActionState`. There is no error message displayed to the user on failure.

---

### 8.3 COMPARTIR Button Visible Even for Private Lists

**File:** `apps/web/app/dashboard/page.tsx:138-147`

The WhatsApp share button is conditionally rendered only if `shareUrl` exists (i.e., if `profile.username` is set). However, it appears for all privacy levels including `'private'` lists. Private lists should not have a share button.

---

### 8.4 No Visual Loading State During Route Transitions

**Files:** All dashboard routes

Navigating between `/dashboard` and `/dashboard/[id]` triggers a full server round-trip with no loading indication. With `revalidate = 0` on some routes this can feel slow.

---

### 8.5 Phone Card Mockup Has Fragile Positioning

**File:** `apps/web/app/page.tsx:117-121`

```tsx
style={{ position: 'absolute', top: -12, right: 120, zIndex: 5 }}
```

The "EJEMPLO REAL" sticker uses `position: absolute` with hardcoded `right: 120` — this breaks on certain viewport widths where the hero section collapses before the phone card does.

---

### 8.6 Gifter Nav Logo Is `<span>` — Not Clickable

**File:** `apps/web/app/[username]/[slug]/page.tsx:87-89`

The logo in every other nav is `<Link href="/">` or `<a href="/">`. The gifter page logo is a non-interactive `<span>`. For an unauthenticated gifter this is the primary viral touchpoint — they see "regala.me" and may want to create their own list. Clicking it does nothing. It should link to `/`.

---

### 8.7 `rg-mono` Always Red — Visual Noise

**File:** `apps/web/app/globals.css:55-62`

`.rg-mono { color: var(--red); }` — all mono labels are red by default. This creates visual noise when red should signal priority or error states. Many uses override color inline (`color: 'rgba(15,15,15,0.5)'`). Consider making the default mono color a neutral ink and only using red explicitly.

---

### 8.7 Price Display Uses `$` Hardcoded in Mobile

**File:** `apps/mobile/app/list/[id].tsx:103`

```typescript
{item.price ? <Text style={styles.price}>${item.price.toLocaleString()}</Text> : null}
```

Uses a hardcoded `$` symbol. The list's `currency` (ARS, BRL, etc.) is not available in this component — it's passed via router params (`is_surprise`) but not `currency`. Fix: pass `currency` as a param or fetch it with the list.

---

### 8.8 No Focus-Visible Styles on Custom Buttons

**File:** `apps/web/app/globals.css`

`.rg-btn` uses `outline: none` on the `rg-input`, and custom buttons have no `:focus-visible` style. Keyboard users and screen reader users get no focus indicator. This is an accessibility violation.

---

## 9. Design System Issues

### 9.1 Mixed `rg-*` Classes and Inline Styles

**Files:** `apps/web/app/auth/AuthForm.tsx`, `apps/web/app/dashboard/new/page.tsx`, `apps/web/app/dashboard/page.tsx`

The design system defines `rg-card`, `rg-btn`, `rg-btn-primary`, etc. in CSS, but many components duplicate the same styles inline:

- `background: 'var(--paper)', border: '2px solid var(--ink)', boxShadow: 'var(--shadow-sm)'` — this is the definition of `rg-card`, duplicated inline in multiple places
- Button styling is partially inline in several components instead of using `rg-btn rg-btn-primary`

---

### 9.2 Mobile Design System Is Completely Disconnected

**Files:** `apps/mobile/constants/colors.ts`, all mobile screens

Mobile uses: warm coral `#E85D4A`, soft borders, rounded corners (`borderRadius: 14-20`), drop shadows.  
Web uses: `#0F0F0F` ink, hard borders, brutalist hard shadows, max 4px radius.

Zero shared design tokens. Users switching between web and mobile see a completely different product aesthetic. At minimum, share the brand primary red and typography tokens.

---

### 9.3 Nav Brand Not Semantic HTML

**Files:** `apps/web/app/auth/AuthForm.tsx:73-84`, `apps/web/app/[username]/[slug]/page.tsx:82-92`

Navigation sections use `<div>` instead of `<nav>`. The `<nav>` element communicates to screen readers that navigation landmarks are present.

---

### 9.4 Surprise Mode in Dashboard Still Shows Claims

**File:** `apps/web/app/dashboard/[id]/page.tsx`

When a list has `is_surprise=true`, the owner's dashboard still shows full claim data (claimer name via strikethrough + green sticker). The public gifter view correctly hides this (blur). The TODOS.md notes this as a deferred P2 but it's a significant UX gap.

---

## 10. Code Quality / Clean Code Issues

### 10.1 `createSlug` Uses Incorrect Unicode Range

**File:** `packages/shared/src/index.ts:32`

```typescript
.replace(/[̀-ͯ]/g, '')
```

This regex removes Unicode combining characters (diacritical marks). The range `̀-ͯ` is the standard Combining Diacritical Marks block. The raw characters in the regex may not be reliably copy-paste safe across editors. Replace with the explicit Unicode escape: `.replace(/[̀-ͯ]/g, '')`.

---

### 10.2 `daysUntil` Timezone Issue

**File:** `packages/shared/src/index.ts:19-25`

```typescript
const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
```

`new Date('2026-12-25')` is parsed as midnight UTC. `Date.now()` is the local time. In Argentina (UTC-3), `Date.now()` is 3 hours behind UTC, so "today" may display as "en 1 día" when it's actually today. Fix: parse as local date or use `date-fns` with timezone support.

---

### 10.3 Inconsistent `?? null` vs `|| null` for Nullable Fields

**File:** `apps/web/app/dashboard/actions.ts:15-17`

```typescript
const occasion = (formData.get("occasion") as string) || null;
const occasion_date = (formData.get("occasion_date") as string) || null;
const currency = (formData.get("currency") as string) || "ARS";
```

Using `|| null` converts empty string to null (intended). But `?? null` would not — it only catches `null`/`undefined`. Both patterns appear in the codebase. Should consistently use `|| null` for string falsy-to-null conversion or explicit `val === '' ? null : val`.

---

### 10.4 Constants Defined Inside Route Module

**File:** `apps/web/app/page.tsx:3-55`

`STEPS`, `WITHOUT`, `WITH`, `USE_CASES`, `TESTIMONIALS`, `FAQS`, `MOCK_PHONE_ITEMS` are large arrays defined at the top of `page.tsx`. These are static content, not code — they should be in a `content/landing.ts` or `data/landing.ts` file for easier editorial updates.

---

### 10.5 `turbo.json` Missing `typecheck` Outputs

**File:** `turbo.json:13-15`

```json
"typecheck": {
  "dependsOn": ["^build"]
}
```

`typecheck` has no `inputs` or `outputs` defined. Turbo won't cache it effectively. Add `"inputs": ["**/*.ts", "**/*.tsx"]` and `"outputs": []` so Turbo can cache typecheck results.

---

### 10.6 `packages/shared` Has No Tests

**File:** `packages/shared/src/index.ts`

Utility functions `createSlug`, `daysUntil`, `occasionEmoji` have no test coverage. `createSlug` has the Unicode regex issue (§10.1) and `daysUntil` has the timezone issue (§10.2) — both would be caught by unit tests.

---

### 10.7 Inconsistent Server Action Patterns

**Files:** `apps/web/app/dashboard/new/page.tsx:20` vs `apps/web/app/auth/AuthForm.tsx:23`

`new/page.tsx` uses `useTransition + startTransition(() => serverAction(fd))`. `AuthForm.tsx` uses the React 19-recommended `useActionState(serverAction, null)` with `<form action={authAction}>`. The inconsistency means the new-list form has no progressive enhancement and the pattern will confuse future contributors. Standardize on `useActionState`.

---

### 10.8 `AuthForm` Inline `linkStyle` Constant at Bottom

**File:** `apps/web/app/auth/AuthForm.tsx:284-287`

```typescript
const linkStyle: React.CSSProperties = { ... }
```

Defined at the bottom of the file after the component export — unusual placement that makes it hard to find. Should be at the top or co-located with first use.

---

### 10.8 `mobile/app/(auth)/reset-password.tsx` Error Display Logic

**File:** `apps/mobile/app/(auth)/reset-password.tsx:64`

```typescript
{error && !password ? (
  // show error state
) : (
  // show form (even when there IS an error if password is typed)
)}
```

If token verification fails but the user starts typing a password, the form is shown (not the error). This means a user with an invalid token could attempt to set a password, which will fail. The error state should be independent of the `password` field.

---

## 11. File Organization Issues

### 11.1 No `components/` Directory in Web App

**File:** `apps/web/`

All reusable UI (Logomark, nav bar, error box, button variants) is either inline or co-located only with specific routes. A `components/` directory for shared UI would improve reusability and enforce the design system.

---

### 11.2 `app/dashboard/actions.ts` Mixes Auth-Required and Public Actions

**Files:** `apps/web/app/dashboard/actions.ts`, `apps/web/app/[username]/[slug]/actions.ts`

The split of public (`claimItem`) vs. owner-only actions into separate files is already correct. However, auth and dashboard actions are in separate files (`auth/actions.ts`, `dashboard/actions.ts`) — this is a good pattern and should be maintained.

---

### 11.3 `recipient_name` Field Never Written

**File:** `apps/web/app/dashboard/actions.ts`, `packages/shared/src/types.ts:27`

`Wishlist.recipient_name` is in the type and schema but never populated by any action or form. Dead schema field.

### 11.4 No `env.example` File

**Files:** Root or `apps/web/`, `apps/mobile/`

The `.env.local` template is only in CLAUDE.md. New contributors have no way to know what environment variables are needed without reading docs. Add `.env.example` / `.env.local.example` files (with dummy values) to both app directories.

---

## 12. Missing Features / Known Gaps (from TODOS.md + Analysis)

| #   | Issue                                       | Status      | Priority |
| --- | ------------------------------------------- | ----------- | -------- |
| M1  | og:image for WhatsApp previews              | In TODOS.md | P2       |
| M2  | Unique constraint on claims                 | In TODOS.md | P2       |
| M3  | Accessibility (ARIA on ClaimButton)         | In TODOS.md | P2       |
| M4  | Surprise mode hides data in owner dashboard | In TODOS.md | P2       |
| M5  | Privacy level support on mobile             | Not tracked | HIGH     |
| M6  | Real-time claim updates                     | In TODOS.md | P3       |
| M7  | User profile page `/{username}`             | In TODOS.md | P3       |
| M8  | Image upload for items                      | In TODOS.md | P3       |
| M9  | Post-claim viral nudge                      | In TODOS.md | P2       |
| M10 | No sitemap / robots.txt                     | Not tracked | Medium   |
| M11 | Supabase TypeScript type generation         | Not tracked | High     |
| M12 | DB indexes on hot columns                   | Not tracked | High     |

---

## 13. Summary Table

| Area           | Critical | High   | Medium | Low    |
| -------------- | -------- | ------ | ------ | ------ |
| Security       | 0        | 6      | 5      | 0      |
| Active Bugs    | 6        | 2      | 3      | 2      |
| Performance    | 0        | 3      | 6      | 1      |
| Architecture   | 0        | 5      | 5      | 3      |
| React/Frontend | 0        | 3      | 8      | 4      |
| TypeScript     | 0        | 1      | 4      | 1      |
| SEO            | 0        | 2      | 4      | 2      |
| UI/UX          | 0        | 3      | 6      | 1      |
| Design System  | 0        | 3      | 4      | 2      |
| Code Quality   | 0        | 0      | 9      | 2      |
| **Total**      | **6**    | **28** | **54** | **18** |

---

## 14. Recommended Fix Priority Order

### P0 — Launch Blockers ✅ Fixed in PR #3 (2026-06-08)

1. ~~**1.2** — `createWishlist` never writes `privacy_level` → ALL new lists return 404 to gifters~~ ✅
2. ~~**1.3** — Mobile add-item inserts `currency` column on `items` → every mobile item add fails~~ ✅
3. ~~**1.6** — Mobile share screen uses email prefix instead of `profiles.username` → wrong WhatsApp URLs~~ ✅
4. ~~**1.5** — Year padding bug `'2'` → `'0'` in mobile create-list~~ ✅
   - Also fixed: mobile `create-list.tsx` now inserts `privacy_level: 'public'` (was NULL, same 404 bug)
   - Also fixed: `Wishlist` type in `packages/shared/src/types.ts` now includes `privacy_level`

### P1 — Pre-Launch Security / Correctness

5. **2.2** — `claimItem` accepts any `item_id` across all wishlists, no rate limiting
6. **2.3** — Add Zod validation to `createWishlist` and `addItem` actions
7. **4.2** — `createWishlist` throws instead of returning `{ error }` — no user feedback
8. **1.4** — Add `UNIQUE(item_id)` constraint on claims + handle violation with friendly message
9. **2.4** — Add email confirmation check to mobile login
10. ~~**4.1/1.1** — Fix `privacy_level` in shared `Wishlist` type~~ ✅ Done in PR #3
11. ~~**4.10** — Add privacy level support to mobile `create-list.tsx`~~ ✅ Done in PR #3
12. **8.3** — Hide COMPARTIR button for private lists

### P2 — Before First Public Traffic

13. **7.1** — Add static `og:image` for WhatsApp link previews (critical for share conversion)
14. **7.3** — Add `metadataBase: new URL('https://regala.me')` to root layout (prerequisite for og:image)
15. **2.1** — Rate limit `/api/extract-product` (require auth or add IP throttle)
16. **3.6** — Add `loading.tsx` and `error.tsx` to at minimum the gifter page route
17. **8.6** — Make gifter nav logo a `<Link href="/">` (viral loop fix)
18. **8.7** — Fix `rg-mono` default color (remove hardcoded red from base class)
19. **9.3** — Add `:focus-visible` styles to `.rg-btn` and `.rg-input`
20. **9.9** — Scope `scrollbar-width: none` to specific containers, not `*`

### P3 — Refactor Backlog (Post-Launch)

21. Extract shared `<BrandNav>` / `<Logomark>` components
22. Parallelize DB queries in dashboard and gifter pages (Promise.all)
23. Replace mobile N+1 queries with batch fetch (2 queries total, not 3N)
24. Add `loading.tsx` files and Suspense boundaries in all route segments
25. Run `supabase gen types typescript` and replace manual types in `packages/shared`
26. Add `sitemap.ts`, `robots.ts`, JSON-LD structured data, `twitter:card`
27. Standardize server action pattern: `useActionState` everywhere (replace `useTransition`)
28. Replace fake testimonials with real user quotes
29. Add unit tests for `packages/shared` (createSlug, daysUntil, occasionEmoji)
30. Fix `daysUntil` timezone handling (UTC vs local date comparison)
31. Add ARIA labels, `role="radiogroup"`, `aria-live` to interactive elements
32. Split `AuthForm.tsx` into focused sub-components per mode
33. Add `@next/bundle-analyzer` for client bundle visibility
