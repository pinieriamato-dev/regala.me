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
profiles (id PK, username UNIQUE, display_name, bio, birthday, avatar_url, created_at)

wishlists (
  id PK, owner_id → profiles.id, title, slug,
  occasion TEXT nullable,         -- 'birthday'|'baby_shower'|'wedding'|'quinceañera'|'graduation'|'other'
  occasion_date DATE nullable,
  recipient_name TEXT nullable,
  is_surprise BOOL default false,
  currency TEXT default 'ARS',    -- ARS|BRL|MXN|CLP|COP|UYU|PEN|USD
  privacy_level TEXT default 'public',  -- 'public'|'link_only'|'private' (is_public column was dropped)
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
  release_token_hash TEXT nullable, -- sha256 of the gifter's undo token (docs/sql/2026-10-19-claim-release.sql)
  created_at TIMESTAMPTZ
)
-- RPCs (SECURITY DEFINER): release_claim(p_item_id, p_token) for gifter undo,
-- release_claim_as_owner(p_item_id) for the owner's "LIBERAR". Applied 2026-10-19.
```

### RLS policies (important — not verified against the live DB)
The descriptions below are from initial setup. The code expects more than they say, and it works in
production, so the live policies are probably broader. Verify with SQL before relying on either.
- `wishlists`: Owners can CRUD their own. The gifter page reads lists with `privacy_level in ('public','link_only')` anonymously; `private` lists 404 (verified E2E).
- `items`: Owners can CRUD via their wishlist. Anyone can SELECT items of a visible list.
- `claims`: Anyone can INSERT (no auth required — gifters just enter their name). The gifter page also
  reads `claims.item_id` anonymously to show claimed state. A second claim on the same item is rejected
  ("¡Ya alguien lo reclamó!", verified E2E).

### Profiles trigger
A DB trigger creates `profiles` on signup. It derives `username` (e.g. `luislarrionda03261900-cccb`)
and `display_name` from the **email local part**, ignoring the name typed at signup
(`user_metadata.display_name`). Usernames can contain `+` (email aliases) — see "Route params" in §7.

### No migration files in repo
Schema was applied via Supabase MCP during initial setup. SQL that a session couldn't apply itself lives in
`docs/sql/` (run by hand in the Supabase SQL editor). Any future schema changes should be applied via the Supabase MCP `apply_migration` tool and documented here.
As of Oct 2026 the Supabase MCP connector in Claude sessions is denied SQL/advisor access — ask the user to grant it, or hand them the SQL to run.

### Auth settings (Supabase dashboard)
- **hCaptcha is enforced by Supabase Auth itself** (Attack Protection), not only by the app. Signup/login/reset
  without a valid token fail with `captcha protection: request disallowed`. Automated browsers can't pass it —
  for E2E, the user temporarily disables it in the dashboard, or you reuse an existing session cookie.
- **Email uses Supabase's default mailer**: English template, sender `noreply@mail.app.supabase.io`, rate-limited
  to a few emails/hour. Links are PKCE (`?code=`), which only completes in the browser that started the flow.
  `/auth/callback` also supports `token_hash` links — switching the templates to those fixes cross-device confirmation.

### Supabase Storage
Bucket `avatars` (public read, owner-scoped upload policies) backs `POST /api/upload-avatar`.
Must exist with upload policies configured — not created via migration, set up manually in the dashboard.

---

## 4. Environment Variables

### Web — `apps/web/.env.local`
```
SUPABASE_URL=https://esyybmnwalscpnzfeowh.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable key>
NEXT_PUBLIC_SITE_URL=https://regala.me        # optional, defaults to https://regala.me
ML_CLIENT_ID=<optional — Mercado Libre client-credentials OAuth for /api/extract-product>
ML_CLIENT_SECRET=<optional — see above>
HCAPTCHA_SITE_KEY=<optional — gates signup/signin/reset forms; captcha is skipped entirely if unset>
```

### Mobile — `apps/mobile/.env`
```
EXPO_PUBLIC_SUPABASE_URL=https://esyybmnwalscpnzfeowh.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

### Turborepo strict env mode (gotcha — this broke prod login once)
Turbo 2 strips env vars that aren't declared in `turbo.json` from the build. **Every new server env var must be
added to `tasks.build.env` in `turbo.json`**, or statically prerendered pages will bake in `undefined`.
(`NEXT_PUBLIC_*` vars pass through automatically.) Pages that must read runtime env should also be
`export const dynamic = 'force-dynamic'` — see `app/auth/page.tsx`.

> **NEVER commit `.env` files.** If the env files are missing, the user must create them manually — the tool sandbox blocks writing `.env*` files.
> Use `printf '...\n' > /x/path/.env` (bash, NOT PowerShell backtick syntax which causes wrapping).

---

## 5. Development Commands

```bash
# From monorepo root
pnpm install                    # install all workspaces
pnpm dev:web                    # Next.js on :3000 (pinned in apps/web/package.json)
pnpm dev:mobile                 # Expo Metro bundler on :8081
pnpm build                      # build all apps
pnpm typecheck                  # typecheck all apps
pnpm --filter web typecheck     # typecheck one app
pnpm --filter mobile typecheck
```

### Dev server port note
Port 3000 is pinned in the `dev` script. `apps/web/app/auth/actions.ts` still falls back to
`http://localhost:3001` as a default `NEXT_PUBLIC_SITE_URL` when that env var is unset — this is
now inconsistent with the pinned port; check before relying on the fallback in local dev.

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
All mutations go through Server Actions in `app/dashboard/actions.ts`, most wired to `useActionState`
(so `(prevState, formData)` signatures, not plain `(formData)`):
- `createWishlist(prevState, formData)` → insert + returns `{ redirectTo }`
- `deleteWishlist(id)` → delete + redirect to `/dashboard`
- `addItem(listId, formData)` / `editItem(itemId, listId, formData)` / `deleteItem(itemId, listId)`
- `updateProfile(prevState, formData)` → display_name/bio/birthday/avatar_url
- `updateSurprise(listId, isSurprise)`, `updatePrivacy(listId, privacyLevel)`
- `mergeWishlists(sourceId, targetId)` → moves all items in one UPDATE, renumbers them after the target's,
  deletes the source only once it's verified empty, then redirects to `/dashboard/{target}?merged=1`.
- `releaseClaim(itemId, listId)` → owner "LIBERAR" via the `release_claim_as_owner` RPC.

`addItem`/`editItem` normalize LATAM-formatted price strings (e.g. `"66.500"` vs `"66,5"` vs
`"1.234,56"`) via locale-aware separator detection before parsing — see `addItemSchema` in
`actions.ts` if touching price handling.

All actions call `revalidatePath()` after mutations.

### Route params (Next.js 15)
Params are **Promises** in Next.js 15 App Router. Always await:
```typescript
type Props = { params: Promise<{ id: string }> }
export default async function Page({ params }: Props) {
  const { id } = await params
}
```
Dynamic params arrive **still percent-encoded** (`ana+x` → `"ana%2Bx"`). Any param used in a DB lookup
(usernames especially) must go through `decodeParam()` from `@/lib/params`.

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
Mobile's `add-item.tsx` uses `Date.now()` for `sort_order`. Web's `addItem()` server action uses numeric increment from the DB max. They're inconsistent, and `Date.now()` (~1.7e12) overflows a Postgres `int4` — if `sort_order` is `INT`, mobile item inserts fail. Fix before reviving mobile.

---

## 10. Public Gifter View

URL: `regala.me/{username}/{slug}`

- **Server component**, `revalidate = 0` (always fresh)
- Shows lists with `privacy_level` `public` or `link_only`; `private` returns 404
- Claims go through the `claimItem` server action (`app/[username]/[slug]/actions.ts`), triggered by `ClaimButton`
- OG image: `opengraph-image.tsx` (Satori — every `<div>` with more than one child needs `display: flex`, or it 500s)
- Surprise mode is enforced server-side: for `is_surprise` lists the dashboard and the owner's gifter view never
  query claims (no names, counts or claimed state in the payload), and the OG description omits the available count
- `claimItem` validates names (2–60 chars, a letter, no links/markup) and rate-limits: per IP in memory
  (best-effort), per list via a DB count (10/min). Gifters get an undo token in localStorage (`regalame:claim:<itemId>`)
- `link_only` lists: "LINK PRIVADO" label, `noindex`, excluded from sitemap/profile; `createSlug` uses a random suffix
- No auth required for gifters — just `claimer_name` is collected
- Viral footer on every public view: "¿QUERÉS HACER TU PROPIA LISTA?"

---

## 11. URL Product Extraction

Endpoint: `GET /api/extract-product?url=<encoded-url>`

Generic path: fetches the URL server-side (Googlebot UA, 8s timeout, 200KB limit), extracts OG tags,
JSON-LD product price, falls back to `og:price:amount`/regex.

**SSRF guard (do not remove)**: resolves the hostname via DNS first and blocks private/loopback/
link-local ranges post-resolution, and re-checks every redirect hop. DNS failures are treated as blocked.
Known gaps: the check and the fetch resolve DNS separately (so rebinding isn't fully prevented). IPv4-mapped IPv6,
100.64/10, 198.18/15, multicast and reserved (224/4+) are blocked since L8.

**Mercado Libre special-case**: ML hosts (`mercadolibre.*`, `mercadopago.*`, `mercadoshops.*`) go
through the ML API instead of HTML scraping — catalog pages (`/p/MLAXXX`) are geo-blocked from Vercel
IPs and require an OAuth token. If `ML_CLIENT_ID`/`ML_CLIENT_SECRET` are set, a client-credentials
token (cached module-level, ~6h TTL) is used to call `/products/{id}` (catalog) and `/items/{id}`
(listings — ML now returns 403 for anonymous `/items` calls). If the API fails, both fall back to a
slug-derived title only (no price/image). As of Oct 2026, listing links (`articulo.mercadolibre…/MLA-…`)
still only get the slug title — the token is likely missing a scope; check the ML app.

Returns `{ title, description, image_url, price, url }`. Used by `add-item-form.tsx` to pre-fill
item fields.

---

## 12. Roadmap & Backlog

The backlog lives in **`ROADMAP.md`** (status, priority, owner — "Claude" for code, "Gian" for dashboard/account tasks).
Update it in the same PR whenever you finish or discover something. Strategy, brand voice and competitors are in
`docs/project/` — read them before product, copy or marketing work.

---

## 13. Cost & Hosting Notes

- **Supabase**: $10/month Pro (sa-east-1) — never downgrade without checking with user
- **Vercel**: live at **www.regala.me** (apex redirects to www). Project `regala-me` in team "Pinieri Amato Dev";
  every push to a branch gets a preview deployment (protected — use the Vercel MCP `get_access_to_vercel_url`
  to open it). Functions run in `gru1` (São Paulo, next to the DB) via `apps/web/vercel.json`.
- **Analytics / error tracking**: none yet (Vercel Web Analytics off) — on the roadmap.
- **Expo EAS**: Not yet configured. Mobile is paused; the web (mobile-first) is the focus.
- Always post the dollar cost explicitly before any `confirm_cost` call on infrastructure changes

---

## 13b. Working Agreements

- **One PR per theme**, branch from latest `main`, PR link always shared with the user (they want it every time).
- **Verify on the Vercel preview** before calling something done: mobile viewport (390px), no horizontal scroll,
  and the real flow (create list → add item → share → claim as anonymous gifter).
- Run `pnpm --filter web typecheck` before pushing; don't commit `apps/web/tsconfig.tsbuildinfo` changes.
- The production DB is shared by previews — clean up any test lists/claims you create.
- Product copy is **Argentine Spanish (voseo)**; code, comments and commits in English.

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
