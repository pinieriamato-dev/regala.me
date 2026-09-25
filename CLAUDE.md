# regala.me — Claude Instructions

> Gift coordination app for LATAM. Shareable wishlists where anyone can claim items without creating an account.
> Tagline: *"Tu lista de regalos, sin dramas."*

---

## 1. Repository Structure

```
regala.me/                          ← monorepo root (Turborepo + pnpm)
├── apps/
│   ├── web/                        ← Next.js 15 App Router (Vercel)
│   └── mobile/                     ← Expo 52 + React Native 0.76.9 (EAS)
├── packages/
│   └── shared/                     ← TypeScript types + shared utilities
├── turbo.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## 2. Tech Stack

| Layer | Web | Mobile |
|---|---|---|
| Framework | Next.js 15 App Router | Expo 52 + Expo Router v4 |
| Language | TypeScript (strict) | TypeScript (strict) |
| Styling | Tailwind 3 + custom CSS (`rg-*` classes) | React Native StyleSheet |
| Backend | Supabase (same project both apps) | Supabase |
| Auth storage | Cookies via `@supabase/ssr` | AsyncStorage |
| Package manager | pnpm (workspaces) | pnpm |
| Build orchestrator | Turborepo | Turborepo |

### Key dependencies
- `@supabase/supabase-js@^2.47.0` — DB + auth client
- `@supabase/ssr@^0.5.0` — web-only, cookie-based session management
- `expo-router@~4.0.0` — file-based routing on mobile
- `shared` (workspace) — imported as `import { ... } from 'shared'` in both apps

---

## 3. Supabase Project

- **Project ID**: `esyybmnwalscpnzfeowh`
- **Region**: sa-east-1 (São Paulo)
- **Org**: Piniei Amato Devs ($10/mo Pro plan)
- **URL**: `https://esyybmnwalscpnzfeowh.supabase.co`

### Schema

```sql
-- Auto-created on signup via trigger
profiles (id PK, username UNIQUE, display_name, avatar_url, created_at)

wishlists (
  id PK, owner_id → profiles.id, title, slug,
  occasion TEXT nullable,         -- 'birthday'|'baby_shower'|'wedding'|'quinceañera'|'graduation'|'other'
  occasion_date DATE nullable,
  recipient_name TEXT nullable,
  is_surprise BOOL default false,
  currency TEXT default 'ARS',    -- ARS|BRL|MXN|CLP|COP|UYU|PEN|USD
  is_public BOOL default true,
  created_at TIMESTAMPTZ
)

items (
  id PK, wishlist_id → wishlists.id, title, description nullable,
  price NUMERIC nullable, image_url nullable, url nullable,
  priority INT,                   -- 1=opcional 2=me gusta 3=esencial
  sort_order INT, created_at TIMESTAMPTZ
)

claims (
  id PK, item_id → items.id,
  claimer_name TEXT NOT NULL,     -- no account required
  claimer_phone TEXT nullable,
  is_group_gift BOOL,
  contribution_amount NUMERIC nullable,
  created_at TIMESTAMPTZ
)
```

### RLS policies (important)
- `wishlists`: Owners can CRUD their own. Anyone can SELECT where `is_public = true`.
- `items`: Owners can CRUD via their wishlist. Anyone can SELECT items of a public list.
- `claims`: Anyone can INSERT (no auth required — gifters just enter their name). Owners can SELECT claims for their lists.

### No migration files in repo
Schema was applied via Supabase MCP during initial setup. Any future schema changes should be applied via `mcp__claude_ai_Supabase__apply_migration` and documented here.

---

## 4. Environment Variables

### Web — `apps/web/.env.local`
```
SUPABASE_URL=https://esyybmnwalscpnzfeowh.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable key>
NEXT_PUBLIC_SITE_URL=https://regala.me        # optional, defaults to https://regala.me
```

### Mobile — `apps/mobile/.env`
```
EXPO_PUBLIC_SUPABASE_URL=https://esyybmnwalscpnzfeowh.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

> **NEVER commit `.env` files.** If the env files are missing, the user must create them manually — the tool sandbox blocks writing `.env*` files.
> Use `printf '...\n' > /x/path/.env` (bash, NOT PowerShell backtick syntax which causes wrapping).

---

## 5. Development Commands

```bash
# From monorepo root
pnpm install                    # install all workspaces
pnpm dev:web                    # Next.js on :3001 (port 3000 often taken)
pnpm dev:mobile                 # Expo Metro bundler on :8081
pnpm build                      # build all apps
pnpm typecheck                  # typecheck all apps
pnpm --filter web typecheck     # typecheck one app
pnpm --filter mobile typecheck
```

### Starting web dev server
Port 3000 may be in use. Use `npx next dev --port 3001` directly from `apps/web/` or update the `dev` script.

### Mobile bundler issue (Windows)
On Windows without Watchman, Metro's FallbackWatcher sometimes tries to watch temporary `expo-splash-screen_tmp_XXXXX` directories that don't exist. Fix: `apps/mobile/metro.config.js` already has a `blockList` for these. If issues persist, run `npx expo start --clear` directly from `apps/mobile/`.

---

## 6. shared Package

Import as `import { ... } from 'shared'` from anywhere in the monorepo.

### Types
```typescript
OccasionId     // 'birthday'|'baby_shower'|'wedding'|'quinceañera'|'graduation'|'other'
Currency       // 'ARS'|'BRL'|'MXN'|'CLP'|'COP'|'UYU'|'PEN'|'USD'
Priority       // 1|2|3
Profile, Wishlist, Item, Claim   // full DB row types
```

### Constants & functions
```typescript
OCCASIONS      // [{ id, label, emoji }] — Spanish labels
CURRENCIES     // string[] of currency codes
occasionEmoji(id)     // → emoji string, defaults to '🎁'
daysUntil(dateStr)    // → 'en X días' | '¡Hoy!' | null
createSlug(title)     // → kebab-case + base36 timestamp (unique)
```

---

## 7. Web App — Key Conventions

### Supabase clients
- **Server (only client in use):** `import { createServerSupabase } from '@/lib/supabase/server'`
  - It's `async` — always `await createServerSupabase()`.
  - Uses `cookies()` from `next/headers` (also async in Next.js 15).
  - All Supabase calls go through Server Actions or Server Components — no browser client exists.

### Server Actions
All mutations go through Server Actions in `app/dashboard/actions.ts`:
- `createWishlist(formData)` → insert + redirect to `/dashboard/[id]`
- `deleteWishlist(id)` → delete + redirect to `/dashboard`
- `addItem(listId, formData)` → insert item
- `deleteItem(itemId, listId)` → delete item

All actions call `revalidatePath()` after mutations.

### Route params (Next.js 15)
Params are **Promises** in Next.js 15 App Router. Always await:
```typescript
type Props = { params: Promise<{ id: string }> }
export default async function Page({ params }: Props) {
  const { id } = await params
}
```

### Auth middleware
`apps/web/middleware.ts` handles redirects:
- `/dashboard/*` → requires auth, else redirect to `/auth`
- `/auth` → if already authed, redirect to `/dashboard`

### TypeScript gotchas
- `cookies()` from `next/headers` returns `Promise` — always `await` it.
- `EventTarget & HTMLInputElement` issue in TS 5.9 — use `(e.target as HTMLInputElement).value`.
- `tsconfig.base.json` must include `"lib": ["ES2022", "dom", "dom.iterable"]` for browser types.

---

## 8. Design System (Web)

The web app uses a **brutalist / neubrutalist** aesthetic inspired by [ugly.cash/es](https://ugly.cash/es). All custom CSS lives in `apps/web/app/globals.css`.

### Palette
| Token | Value | Use |
|---|---|---|
| `--bg` | `#F2F0E6` | Page background (warm cream) |
| `--ink` | `#0F0F0F` | Text, borders, shadows |
| `--paper` | `#FBF8EE` | Card/surface backgrounds |
| `--yellow` | `#F5E13E` | Highlighted words, section bands, yellow cards |
| `--red` | `#E63322` | Accent, priority badges, CTA |
| `--green` | `#2EC25E` | Claimed state, success |

### Typography
| Role | Font | Class |
|---|---|---|
| Display / headlines | Archivo Black | `.rg-display` |
| Body / UI | Inter | body default |
| Labels / metadata | JetBrains Mono | `.rg-mono` |

**Display rules**: ALL CAPS, `letter-spacing: -0.03em`, `line-height: 0.88`.
**Yellow highlight** for key words: wrap in `<span className="rg-em">WORD</span>` — renders with yellow background, slight rotation, hard shadow.

### Core CSS classes
```css
.rg-display     /* Archivo Black, uppercase, tight */
.rg-em          /* Yellow highlight box with rotation */
.rg-mono        /* JetBrains Mono, red color, uppercase labels */
.rg-card        /* Paper bg, 2px ink border, 3px hard shadow */
.rg-card-yellow /* Yellow bg card */
.rg-card-ink    /* Dark card with light text */
.rg-btn         /* Base button: Archivo Black, 4px radius, uppercase */
.rg-btn-primary /* Ink bg, paper text */
.rg-btn-yellow  /* Yellow bg, ink text */
.rg-btn-ghost   /* Paper bg, ink border */
.rg-input       /* Paper bg, ink border, hard focus shadow */
.rg-sticker     /* Small badge: yellow default */
.rg-sticker-red / -green / -ink / -paper
.rg-divider     /* 2px ink horizontal rule */
.rg-img-ph      /* Striped image placeholder */
```

### Hard shadows (no blur)
All cards and buttons use **offset box-shadows without blur**:
- Small: `3px 3px 0 0 #0F0F0F`
- Regular: `5px 5px 0 0 #0F0F0F`
- Hover on buttons: `transform: translate(-1px, -1px)` + larger shadow

### Priority badges
```
priority 3 → <span class="rg-sticker rg-sticker-red">ESENCIAL</span>
priority 2 → <span class="rg-sticker">ME GUSTA</span>
priority 1 → <span class="rg-sticker rg-sticker-paper">OPCIONAL</span>
```

### Tailwind colors (in tailwind.config.ts)
`bg`, `ink`, `paper`, `yellow`, `red`, `green` are registered. Use as `className="bg-yellow text-ink"` etc. But prefer inline styles for complex layouts — the design often uses inline `style={{}}` to match the prototype exactly.

---

## 9. Mobile App — Key Conventions

### Design tokens
All colors in `apps/mobile/constants/colors.ts`. The mobile app uses a **different palette** from the web (warm coral `#E85D4A` primary, cream `#FDF6EC` background) — the mobile design predates the brutalist web redesign and has not been updated yet.

### Navigation
- Expo Router file-based: `app/(tabs)/index.tsx` = tabs root
- Modals: `create-list.tsx`, `add-item.tsx`, `share.tsx` — presented as stack modals
- Auth guard: `app/_layout.tsx` handles all redirects via `useAuth` hook

### Supabase on mobile
```typescript
import { supabase } from '@/lib/supabase'
// AsyncStorage-backed, auto-refreshes tokens
```

### Sort order for items
Mobile's `add-item.tsx` uses `Date.now()` for `sort_order`. Web's `addItem()` server action uses numeric increment from the DB max. They're inconsistent — items added on mobile will appear at the end on web (large timestamp = high sort_order), which is probably fine.

---

## 10. Public Gifter View

URL: `regala.me/{username}/{slug}`

- **Server component**, `revalidate = 0` (always fresh)
- Requires `is_public = true` on the wishlist — returns 404 otherwise
- Claims are inserted client-side via the `ClaimButton` component
- No auth required for gifters — just `claimer_name` is collected
- Viral footer on every public view: "¿QUERÉS HACER TU PROPIA LISTA?"

---

## 11. URL Product Extraction

Endpoint: `GET /api/extract-product?url=<encoded-url>`

Fetches the URL server-side (Googlebot UA, 8s timeout, 200KB limit), then:
1. Extracts Open Graph tags (`og:title`, `og:description`, `og:image`)
2. Parses JSON-LD product schema for price
3. Falls back to `og:price:amount` or regex

Returns `{ title, description, image_url, price, url }`. Used by `add-item-form.tsx` to pre-fill item fields.

---

## 12. Known Gaps (as of May 2026)

| # | Gap | Priority |
|---|---|---|
| 1 | No image upload (image_url field exists but no UI to upload) | P1 |
| 2 | Mobile design not updated to brutalist web system | P1 |
| 3 | No real-time claim updates on gifter view (currently requires reload) | P1 |
| 4 | `dashboard/new/page.tsx` uses Tailwind classes, not `rg-*` system — inconsistent styling | P2 |
| 5 | No user profile page at `regala.me/{username}` | P2 |
| 6 | No privacy levels on wishlists (is_public is binary — no "link only" option) | P2 |
| 7 | No push notifications when all items claimed | P2 |
| 8 | No group gift contribution UI | P3 |
| 9 | Sort order inconsistency between web and mobile | Low |
| 10 | No OAuth (Google sign-in) despite spec mentioning it | P2 |

---

## 13. Cost & Hosting Notes

- **Supabase**: $10/month Pro (sa-east-1) — never downgrade without checking with user
- **Vercel**: Free tier — web app not yet deployed
- **Expo EAS**: Not yet configured
- Always post the dollar cost explicitly before any `confirm_cost` call on infrastructure changes

---

## 14. What the User Cares About

- **LATAM focus**: Argentine Spanish, ARS as default currency, WhatsApp as share channel
- **Zero friction for gifters**: No account required to claim — non-negotiable
- **Brutalist design** on web (ugly.cash-inspired): hard borders, Archivo Black, yellow highlights, NO blurs, NO rounded corners beyond 4px
- **Mobile first**: Most users will open shared links on mobile browsers
- **Product URL extraction**: Big differentiator — paste a link, auto-fill the item
- Avoid mentioning Google Sheets or WhatsApp as primary CTA (both previously removed per user feedback)
- Never say "gratis para siempre" — honest about future premium possibility

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
