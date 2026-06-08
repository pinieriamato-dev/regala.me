# Audit Fixes — P0 Launch Blockers

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 active breakages that make the product non-functional right now — gifter pages 404, mobile item add fails, wrong WhatsApp share URLs, corrupted dates.

**Architecture:** Surgical edits to 3 mobile files and 1 web server action. No new files, no new abstractions.

**Tech Stack:** Next.js 15 Server Actions, Supabase, Expo 52 React Native.

---

### Task 1: Fix `privacy_level` never written on wishlist creation → gifter page 404 for all lists

**Files:**
- Modify: `apps/web/app/dashboard/actions.ts`

**Problem:** `createWishlist` inserts `is_public` but never inserts `privacy_level`. The DB gets `NULL`. The gifter page filters `.in('privacy_level', ['public', 'link_only'])` — `NULL` never matches, so every list created via web returns 404 to gifters.

- [ ] **Step 1: Add `privacy_level` to the insert**

In `apps/web/app/dashboard/actions.ts`, the `.insert({...})` block (around line 24) currently has:

```typescript
.insert({
  owner_id: user.id,
  title,
  slug,
  occasion,
  occasion_date: occasion_date || null,
  currency,
  is_surprise,
  is_public: privacy_level !== 'private',
})
```

Change to:

```typescript
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
```

- [ ] **Step 2: Smoke-test**

Run `pnpm dev:web`, create a new list, then open `localhost:3001/{your-username}/{slug}` in a private/incognito window (unauthenticated). Should load instead of 404.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/dashboard/actions.ts
git commit -m "fix: write privacy_level on wishlist insert — gifter page was 404 for all new lists"
```

---

### Task 2: Remove `currency` from mobile items insert — every mobile item add fails

**Files:**
- Modify: `apps/mobile/app/add-item.tsx`

**Problem:** `add-item.tsx` inserts `currency` into the `items` table, but `items` has no `currency` column (it's on `wishlists`). Supabase returns an error and item creation fails every time.

- [ ] **Step 1: Remove `currency` state and its UI**

In `apps/mobile/app/add-item.tsx`:

1. Delete the `currency` state: `const [currency, setCurrency] = useState<Currency>('ARS')`
2. Remove `CURRENCIES` from the import: line 9 becomes `import type { Priority } from 'shared'`
3. Delete the currency picker `<ScrollView>` inside the price row (the horizontal chip list of ARS, BRL, etc.)
4. Remove `currency` from the `.insert({...})` call

The cleaned-up insert (around line 32):

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

- [ ] **Step 2: Verify in Expo Go**

Start mobile bundler (`pnpm dev:mobile`), open a wishlist, tap "Add item", fill in a title and price, submit. Should succeed and navigate back.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/add-item.tsx
git commit -m "fix: remove currency from items insert — column does not exist on items table"
```

---

### Task 3: Fix mobile share URL — uses email prefix instead of `profiles.username`

**Files:**
- Modify: `apps/mobile/app/share.tsx`

**Problem:** The share URL is built with `user?.email?.split('@')[0]` as the username. The actual public URL uses `profiles.username`, which is different. WhatsApp shares a broken URL.

- [ ] **Step 1: Replace the `useEffect` to fetch `profiles.username`**

In `apps/mobile/app/share.tsx`, replace the `useEffect` (lines 16–23):

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

- [ ] **Step 2: Verify**

In Expo Go, create a list and reach the share screen. The URL preview should show `regala.me/{actual-username}/{slug}`, not the email prefix.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/share.tsx
git commit -m "fix: use profiles.username for share URL — email prefix was generating wrong WhatsApp links"
```

---

### Task 4: Fix mobile year padding bug — `'2'` → `'0'` in create-list date

**Files:**
- Modify: `apps/mobile/app/create-list.tsx`

**Problem:** Line 33 uses `year.padStart(4, '2')`. Padding with `'2'` instead of `'0'` turns year `'24'` into `'2224'`. Dates are silently corrupted in the DB.

- [ ] **Step 1: Fix the pad character**

In `apps/mobile/app/create-list.tsx`, line 33, change:

```typescript
? `${year.padStart(4, '2')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
```

to:

```typescript
? `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
```

- [ ] **Step 2: Quick sanity check**

In your head: `'24'.padStart(4, '0')` → `'0024'`. `'2026'.padStart(4, '0')` → `'2026'` (unchanged — already 4 chars). Correct.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/create-list.tsx
git commit -m "fix: year padding uses '0' not '2' — years like '24' were being stored as '2224'"
```

---

## Done

All 4 P0 blockers fixed. Continue with `2026-06-01-audit-p1-security-correctness.md`.
