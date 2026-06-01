# Audit Fixes — P2 Before First Public Traffic

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** P0 and P1 plans complete.

**Goal:** Everything needed before the first WhatsApp link goes out — og:image for link previews, `metadataBase`, auth-guard the product URL extractor, add loading/error UI on the most-trafficked page, fix the viral nav logo, CSS polish, `robots.txt`, `sitemap.xml`, env examples.

**Architecture:** Two new Next.js metadata route files (`robots.ts`, `sitemap.ts`), one OG image route (`opengraph-image.tsx`), two UI boundary files (`loading.tsx`, `error.tsx`). CSS edits in `globals.css`. No new npm packages beyond `@vercel/og` (which Next.js 14+ bundles via `next/og`).

**Tech Stack:** Next.js 15 App Router metadata routes, `next/og` (ImageResponse), Supabase Server Component.

---

### Task 1: Add `metadataBase` + `twitter:card` to root layout

**Files:**
- Modify: `apps/web/app/layout.tsx`

Without `metadataBase`, Next.js cannot resolve relative og:image URLs — they'll be broken in all link previews. One-line fix, required before og:image works.

- [ ] **Step 1: Update the `metadata` export**

In `apps/web/app/layout.tsx`, replace the `metadata` export:

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

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/layout.tsx
git commit -m "fix: add metadataBase + twitter:card to root layout — prerequisite for og:image"
```

---

### Task 2: Dynamic og:image for gifter pages

**Files:**
- Create: `apps/web/app/[username]/[slug]/opengraph-image.tsx`

WhatsApp link previews need `og:image`. This is the primary share channel and the highest-impact SEO gap. `next/og` is included with Next.js — no new package needed.

- [ ] **Step 1: Create `opengraph-image.tsx`**

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
    .select('title, recipient_name, profiles!inner(username, display_name)')
    .eq('slug', slug)
    .eq('profiles.username', username)
    .in('privacy_level', ['public', 'link_only'])
    .single()

  const title = list?.title ?? 'Lista de regalos'
  const ownerName = (list?.profiles as { display_name?: string | null } | null)?.display_name ?? username

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          background: '#F2F0E6',
          padding: '60px 80px',
          position: 'relative',
        }}
      >
        {/* Brand label */}
        <div style={{
          display: 'flex',
          marginBottom: 28,
          fontSize: 22,
          color: '#E63322',
          fontFamily: 'monospace',
          textTransform: 'uppercase',
          letterSpacing: 6,
          fontWeight: 700,
        }}>
          regala.me
        </div>

        {/* Title */}
        <div style={{
          display: 'flex',
          fontSize: title.length > 30 ? 64 : 80,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: -2,
          lineHeight: 0.9,
          color: '#0F0F0F',
          marginBottom: 28,
          maxWidth: 1000,
          fontFamily: 'Impact, sans-serif',
        }}>
          {title}
        </div>

        {/* Owner */}
        <div style={{
          display: 'flex',
          fontSize: 28,
          color: 'rgba(15,15,15,0.50)',
          fontFamily: 'monospace',
          textTransform: 'uppercase',
          letterSpacing: 2,
        }}>
          de {ownerName}
        </div>

        {/* CTA badge */}
        <div style={{
          position: 'absolute',
          bottom: 60,
          right: 80,
          display: 'flex',
          background: '#F5E13E',
          border: '4px solid #0F0F0F',
          padding: '14px 28px',
          fontSize: 24,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: '#0F0F0F',
        }}>
          ELEGÍ TU REGALO →
        </div>
      </div>
    ),
    { ...size }
  )
}
```

- [ ] **Step 2: Verify the OG image renders**

Start dev server, visit `localhost:3001/{username}/{slug}/opengraph-image` in the browser. Should show the branded card image (not an error page).

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/[username]/[slug]/opengraph-image.tsx
git commit -m "feat: dynamic og:image for gifter pages — WhatsApp previews now show branded wishlist card"
```

---

### Task 3: Require auth on `/api/extract-product`

**Files:**
- Modify: `apps/web/app/api/extract-product/route.ts`

The endpoint makes outbound HTTP fetches with no auth — anyone can use it as an open proxy. Add a session check at the top of the `GET` handler.

- [ ] **Step 1: Add import and auth guard**

In `apps/web/app/api/extract-product/route.ts`, add the import at the top:

```typescript
import { createServerSupabase } from '@/lib/supabase/server'
```

Then at the very start of the `GET` function body (after `const rawUrl = ...` line is fine to keep, but add auth before the DNS/fetch logic):

```typescript
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const rawUrl = request.nextUrl.searchParams.get('url')
  // ... rest of handler unchanged
```

- [ ] **Step 2: Verify `add-item-form.tsx` still works**

The `add-item-form.tsx` sends this request from the dashboard (user is authenticated), so no client change needed. Confirm by adding an item via URL paste in the dashboard — should still extract product data.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/extract-product/route.ts
git commit -m "fix: require auth on /api/extract-product — was an open SSRF proxy endpoint"
```

---

### Task 4: Add `loading.tsx` and `error.tsx` for the gifter route

**Files:**
- Create: `apps/web/app/[username]/[slug]/loading.tsx`
- Create: `apps/web/app/[username]/[slug]/error.tsx`

The gifter page is the highest-traffic unauthenticated route — it's what gets opened from WhatsApp. No loading state means a blank white screen while data fetches. No error state means Next.js's default dev error page shows to gifters on any server error.

- [ ] **Step 1: Create `loading.tsx`**

Create `apps/web/app/[username]/[slug]/loading.tsx`:

```typescript
export default function GifterLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ height: 4, background: 'var(--ink)' }} />
      <div style={{
        padding: '14px 20px', borderBottom: '2px solid var(--ink)',
        background: 'var(--paper)',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: -0.5 }}>
          regala<span style={{ color: 'var(--red)' }}>.</span>me
        </span>
      </div>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px' }}>
        {/* Title skeleton */}
        <div style={{ width: '65%', height: 52, background: 'rgba(15,15,15,0.08)', marginBottom: 16, borderRadius: 2 }} />
        <div style={{ width: '40%', height: 20, background: 'rgba(15,15,15,0.06)', marginBottom: 32, borderRadius: 2 }} />
        {/* Item skeletons */}
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            height: 88, background: 'var(--paper)',
            border: '2px solid var(--ink)', marginBottom: 12,
          }} />
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
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: -0.5, marginBottom: 40 }}>
        regala<span style={{ color: 'var(--red)' }}>.</span>me
      </div>
      <h1 className="rg-display" style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', marginBottom: 12 }}>
        ALGO SALIÓ MAL.
      </h1>
      <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.6)', marginBottom: 28, maxWidth: 320 }}>
        No pudimos cargar esta lista. Intentá recargar la página.
      </p>
      <a href="/" className="rg-btn rg-btn-primary" style={{ padding: '14px 28px', fontSize: 13 }}>
        IR AL INICIO →
      </a>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/[username]/[slug]/loading.tsx apps/web/app/[username]/[slug]/error.tsx
git commit -m "feat: loading skeleton and error page for gifter route"
```

---

### Task 5: Fix gifter nav logo — make it a clickable `<Link>`

**Files:**
- Modify: `apps/web/app/[username]/[slug]/page.tsx`

The logo in the gifter nav is a non-interactive `<span>`. Every other nav on the site uses a link. This is the primary viral touchpoint — gifters see "regala.me" and clicking it should take them to the homepage to create their own list.

- [ ] **Step 1: Replace `<span>` with `<Link>`**

In `apps/web/app/[username]/[slug]/page.tsx`, ensure `Link` is imported from `next/link` (it should be). Replace the logo `<span>` in the nav (around line 86–88):

```tsx
{/* Before */}
<span style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: -0.5 }}>
  regala<span style={{ color: 'var(--red)' }}>.</span>me
</span>

{/* After */}
<Link
  href="/"
  style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: -0.5, textDecoration: 'none', color: 'var(--ink)' }}
>
  regala<span style={{ color: 'var(--red)' }}>.</span>me
</Link>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/[username]/[slug]/page.tsx
git commit -m "fix: gifter page nav logo is now a link to / — viral touchpoint was non-clickable span"
```

---

### Task 6: Add post-claim viral nudge in `ClaimButton`

**Files:**
- Modify: `apps/web/app/[username]/[slug]/claim-button.tsx`

After a successful claim, the current UI shows just a green sticker. The 5 seconds after a claim is the highest-intent moment to convert gifters into list creators. Add an inline mini-card below the sticker.

- [ ] **Step 1: Update the `state?.success` render block**

In `apps/web/app/[username]/[slug]/claim-button.tsx`, replace lines 10–16 (the success return):

```tsx
if (state?.success) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginTop: 8 }}>
      <span
        className="rg-sticker rg-sticker-green"
        style={{ fontSize: 11, padding: '5px 12px', alignSelf: 'flex-start' }}
      >
        ✓ ¡GRACIAS!
      </span>
      <a
        href="/auth?mode=signup"
        style={{
          display: 'block',
          padding: '12px 14px',
          background: 'var(--yellow)',
          border: '2px solid var(--ink)',
          boxShadow: '3px 3px 0 0 var(--ink)',
          textDecoration: 'none',
          color: 'var(--ink)',
        }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: -0.3, textTransform: 'uppercase', lineHeight: 1.1 }}>
          ¿TENÉS UN CUMPLE PRÓXIMAMENTE?
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 11, marginTop: 4, color: 'rgba(15,15,15,0.7)' }}>
          Armá tu lista en 2 min →
        </div>
      </a>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/[username]/[slug]/claim-button.tsx
git commit -m "feat: post-claim viral nudge — 'armá tu lista' card shown inline after successful claim"
```

---

### Task 7: CSS fixes — `rg-mono` color, scrollbar scope, `focus-visible`

**Files:**
- Modify: `apps/web/app/globals.css`

Three independent CSS problems:
1. `.rg-mono { color: var(--red) }` makes all mono labels red — red should be reserved for priorities/errors
2. `* { scrollbar-width: none }` hides scrollbars everywhere including the page body
3. No `:focus-visible` on `.rg-btn` or `.rg-input` — keyboard users have no focus indicator

- [ ] **Step 1: Fix `.rg-mono` default color**

In `apps/web/app/globals.css`, find the `.rg-mono` block and change `color: var(--red)` to:

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

Any component that specifically wants red mono should use `style={{ color: 'var(--red)' }}` inline.

- [ ] **Step 2: Scope `scrollbar-width: none` away from `*`**

Find the `* { scrollbar-width: none }` block and replace with a scoped rule. Check what elements actually need hidden scrollbars (likely the marquee animation track and any horizontal chip scrollers). Replace with:

```css
.rg-scroll-hidden {
  scrollbar-width: none;
}
.rg-scroll-hidden::-webkit-scrollbar {
  display: none;
}
```

Then add `className="rg-scroll-hidden"` to the marquee track in `apps/web/app/page.tsx` and any horizontal `overflow-x: auto` containers that shouldn't show scrollbars.

- [ ] **Step 3: Add `:focus-visible` styles**

After the `.rg-btn` rule block, add:

```css
.rg-btn:focus-visible {
  outline: 3px solid var(--ink);
  outline-offset: 2px;
  box-shadow: 4px 4px 0 0 var(--ink);
}

.rg-input:focus-visible {
  outline: 3px solid var(--ink);
  outline-offset: 0;
  box-shadow: 4px 4px 0 0 var(--ink);
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/globals.css apps/web/app/page.tsx
git commit -m "fix: rg-mono neutral color, scope scrollbar:none, add focus-visible on buttons and inputs"
```

---

### Task 8: Add `robots.ts` and `sitemap.ts`

**Files:**
- Create: `apps/web/app/robots.ts`
- Create: `apps/web/app/sitemap.ts`

No crawl guidance and no sitemap. `/dashboard` and `/auth` should not be indexed; gifter pages should be.

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
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  return [
    {
      url: 'https://regala.me',
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    ...gifterPages,
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/robots.ts apps/web/app/sitemap.ts
git commit -m "feat: robots.ts and sitemap.ts — block /dashboard and /auth, index public gifter pages"
```

---

### Task 9: Add `.env.local.example` files

**Files:**
- Create: `apps/web/.env.local.example`
- Create: `apps/mobile/.env.example`

New contributors have no reference for required env vars — the only docs are in CLAUDE.md.

- [ ] **Step 1: Create `apps/web/.env.local.example`**

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJh...
SITE_URL=https://regala.me
```

- [ ] **Step 2: Create `apps/mobile/.env.example`**

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJh...
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/.env.local.example apps/mobile/.env.example
git commit -m "docs: add .env.example files — onboarding reference for required environment variables"
```

---

## Done

All P2 pre-launch tasks complete. Continue with `2026-06-01-audit-p3-post-launch.md`.
