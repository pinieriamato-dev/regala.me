# TODOS — regala.me

Deferred work from `/plan-ceo-review` on 2026-05-31.
Pre-launch tasks are in `.gstack/projects/regala.me/ceo-plans/2026-05-31-launch-readiness.md`.

---

## P2 — Week 2 (post first 5 users)

### Duplicate claim prevention
**What:** Unique constraint on `(item_id, claimer_name)` at DB level + handle constraint violation in ClaimButton with a friendly message ("Ya alguien lo reclamó con ese nombre").  
**Why:** A double-tap or page reload on a slow connection creates two identical claims, making the available count wrong.  
**Effort:** S (~30 min) — Supabase migration + ClaimButton error handling.  
**Depends on:** None.

### WhatsApp link preview image (og:image)
**What:** Dynamic og:image for `/{username}/{slug}` using `@vercel/og`. Card shows wishlist title, recipient name, regala.me wordmark.  
**Why:** Link cards with images get dramatically higher tap rates in WhatsApp. This is the primary shareable URL.  
**Effort:** M (human: ~2 days / CC: ~2 hours) — Vercel OG setup, font loading, card design.  
**Depends on:** Vercel deployment live.

### Replace fake testimonials with real quotes
**What:** `page.tsx:34-38` — swap Sofí M., Lucía G., Tomás L. with real quotes collected from first users.  
**Why:** Fabricated testimonials erode trust with users who know you personally. Real quotes from real people compound.  
**Effort:** S — content swap only, code already exists.  
**Depends on:** 3 real user quotes collected (week 2-3 post-launch).

### ARIA accessibility — ClaimButton + items list
**What:** `aria-live` region on ClaimButton for state changes (idle → asking → loading → done), `role="radiogroup"` + `aria-checked` on the T7 privacy toggle pill buttons, `aria-label="[item title], [claimed/available]"` on each item row.  
**Why:** Screen reader users (including older relatives of birthday people — a real persona for this app) get no feedback when claim state changes. Estimated 5-10% of visitors likely use assistive tech.  
**Effort:** S (~30 min) — claim-button.tsx + dashboard/new/page.tsx + gifter page.tsx.  
**Depends on:** T7 (dashboard/new redesign) shipped first for privacy toggle ARIA.

### Post-claim inline viral nudge
**What:** After `step === 'done'` (green "✓ ¡GRACIAS!" sticker), show an inline mini-card in the same item slot: "¿Tenés un cumpleaños próximamente? Armá tu lista en 2 min." with a → link to `/auth?mode=signup`.  
**Why:** The gifter-to-creator loop has 7-month average decay (claim in April, birthday in November). The 5 seconds after a successful claim is the highest-intent referral moment — the user is warm, they just experienced the product working, and they're still on the page. Passive viral footer 400px below is not enough.  
**Effort:** S (~15 min) — conditional render in claim-button.tsx done state.  
**Depends on:** None. Can be added independently.

---

## P2 — Deferred features

### Surprise mode: full creator dashboard view
**What:** When `is_surprise=true`, the creator's dashboard view should also hide which specific items were claimed (show count only, not names).  
**Why:** The gifter view check (T4 pre-launch) prevents the creator from seeing claims on the public page, but the dashboard still shows full claim data.  
**Effort:** M (~2 hours) — add surprise check to dashboard/[id]/page.tsx.  
**Depends on:** T4 (surprise mode gifter fix) shipped first.

### Link-only privacy: full effect requires profile directory
**What:** `privacy_level='link_only'` lists don't appear in any directory — only accessible via direct URL.  
**Why:** The link-only feature built in T7 (pre-launch) is semantically correct but has no functional difference from 'public' until a profile page (`/{username}`) is built. The directory is the thing that makes link-only meaningful.  
**Effort:** M (human: ~1 day / CC: ~1 hour) — build `/{username}` profile page that lists `privacy_level='public'` wishlists only.  
**Depends on:** T7 (link-only schema) shipped first; Gap #5 in CLAUDE.md.

---

## P3 — Post-traction

### Real-time claim updates on gifter view
**What:** Supabase Realtime subscription on the claims channel so claimed items update without a page reload.  
**Why:** Currently a gifter sees stale state until they reload. With multiple gifters viewing simultaneously, coordination breaks.  
**Effort:** M (human: ~1 day / CC: ~1 hour).  
**Depends on:** Enough concurrent users to make this matter.

### User profile page `/{username}`
**What:** Public page listing all public wishlists for a user, SEO-optimized.  
**Why:** Enables link-only mode to be meaningful + creates a shareable identity for power users.  
**Effort:** M (human: ~1 day / CC: ~30 min).  
**Depends on:** None technically; strategically: when users want a persistent identity.

### Image upload for items
**What:** `image_url` field exists in schema but no UI to set it. Add upload or URL-paste for item images.  
**Why:** Items with images have much higher claim rates. MercadoLibre extraction already sets `image_url` when it works.  
**Effort:** M-L depending on whether you use Supabase Storage or URL-only.  
**Depends on:** None.
