# regala.me — Roadmap

> Single source of truth for what's next. Update it in the same PR that finishes or discovers work.
> **Owner:** `Claude` = code change Claude can do in a session · `Gian` = needs dashboard/account access.
> **Status:** `todo` · `doing` · `blocked` · `done`
> Focus: **web (mobile-first)**. Native app is paused.

Last updated: 2026-10-19 (later items L7, L8 partial, L9)

---

## Now — trust & core-loop bugs

| # | Item | Why | Owner | Status |
|---|---|---|---|---|
| N1 | **Enforce surprise mode server-side.** Don't send claimer names/claimed state to the owner when `is_surprise`. Hide the claimed count on the dashboard and claimed badges on the owner's public view. | Today the owner sees "1 RECLAMADOS", "✓ RECLAMADO Mate imperial", and names are in the HTML. Breaks the core promise. | Claude | done |
| N2 | **Undo / release a claim.** Gifter "deshacer" (token in localStorage), owner "liberar" button. | Mistakes currently need a manual DB edit. SQL (`docs/sql/2026-10-19-claim-release.sql`) applied 2026-10-19. Claims made before that have no token, so only the owner can release them. | Claude | done |
| N3 | **Claim abuse protection.** Rate limit per IP + per list on `claimItem`, length/charset checks on names. | A script can claim a whole list in seconds. Per-IP limit is in-memory per instance (best-effort); per-list limit (10/min) is checked in the DB. | Claude | done |
| N4 | **`link_only` lists done right.** Correct label (not "LISTA PÚBLICA"), `noindex`, random slug suffix. | Today they're labelled public, indexable and the slug is guessable. New slugs get a random suffix; existing lists keep their slug so shared links don't break. | Claude | done |
| N5 | **Transactional merge.** Single Postgres function (RPC), plus success feedback and a redirect. | Partial failure can delete items; no feedback after merging. Done without SQL: items move in one atomic UPDATE and the source is only deleted once verified empty. | Claude | done |
| N6 | **Move Vercel functions to `gru1` (São Paulo).** | DB is in sa-east-1; every page makes several US↔BR round trips. | Claude | done |
| N7 | **Item delete confirmation / undo.** | Deleting is instant and irreversible. | Claude | done |

## Now — needs Gian (≈15 min total)

| # | Item | Why | Owner | Status |
|---|---|---|---|---|
| G1 | **Enable Vercel Web Analytics** (Project → Analytics → Enable). | Zero visibility on traffic today. | Gian | todo |
| G2 | **Custom SMTP (Resend) + Spanish email templates** in Supabase Auth. Use `token_hash` links: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`. | Default mailer is English, sent from supabase.io, and rate-limited to a few emails/hour. PKCE links fail cross-device. | Gian (+Claude writes templates) | todo |
| G3 | **Grant SQL access to the Supabase connector.** | Needed for P1, RLS audit and real metrics. | Gian | todo |
| G4 | **Mercado Libre app scopes.** Check the ML Developers app; listing links only get a slug title, with no price or image. | Product-link extraction is the main differentiator. | Gian | todo |

## Next — growth (Navidad window: launch by ~Nov 15)

| # | Item | Why | Owner | Status |
|---|---|---|---|---|
| X1 | **Amigo invisible.** Create a group, invite via link, draw names, each participant gets their own regala.me list. | Proven demand (Elfster). Every participant becomes a list creator, giving a December acquisition spike. | Claude | todo |
| X2 | **Product analytics** (PostHog). Events: `list_created`, `item_added`, `link_extracted`, `list_shared`, `list_viewed`, `item_claimed`, `signup_from_gifter_footer`. | Measure the viral loop (gifter → creator). | Claude | todo |
| X3 | **Branded OG image.** Archivo Black, bigger title, item count, owner name. | It's the WhatsApp card, the main acquisition surface. | Claude | done |
| X4 | **Landing page cleanup.** Real testimonials instead of invented ones; remove "CREAR LISTA GRATIS"; per-occasion sections. | Trust, and the "never promise free forever" rule. | Claude + Gian (quotes) | todo |
| X5 | **Owner notification on claim** (email; respect surprise mode). | Retention + "magic moment". | Claude (after G2) | todo |
| X6 | **Realtime claimed state** on the gifter page (Supabase Realtime). | Avoids two people buying the same gift. | Claude | todo |

## Later

| # | Item | Notes |
|---|---|---|
| P1 | Username/display_name not derived from email. Use the signup name; let users pick a username. | DB trigger change (needs G3). Today emails leak into public URLs and the sitemap. |
| L1 | Mercado Libre affiliate links on "Comprar" | Main monetization. Needs ML Afiliados approval + monotributo. |
| L2 | Group gift / colecta via Mercado Pago | DB columns already exist. |
| L3 | Premium per event (wedding / quinceañera / baby shower) | Cover, invitation + QR, RSVP, custom URL. |
| L4 | Item image upload + drag reorder | |
| L5 | PWA (manifest + install prompt) | App-like without stores. |
| L6 | SEO landing pages per occasion/country + comparison pages | milistita.com is already doing this. |
| L8 | SSRF guard: **pin the resolved IP** so the fetch can't re-resolve DNS (IPv4-mapped IPv6 and missing ranges are done). | See CLAUDE.md §11. |

## Engineering hygiene

| # | Item | Owner | Status |
|---|---|---|---|
| H1 | GitHub Actions CI: typecheck + shared tests on every PR | Claude | done |
| H2 | Turn the Oct-2026 Playwright E2E run into a repeatable script (runs against a preview) | Claude | todo |
| H3 | Generated Supabase types (`supabase gen types`) so schema drift fails typecheck | Claude (needs G3) | todo |
| H4 | ESLint config (`next lint` currently prompts for setup) | Claude | todo |
| H5 | Fix `shared/types.ts` (`is_public` → `privacy_level`; Profile missing `bio`/`birthday`) | Claude | done |
| H6 | Gitignore `apps/web/tsconfig.tsbuildinfo` (changes on every typecheck) | Claude | done |

---

## Done

| Date | What | PR |
|---|---|---|
| 2026-10-19 | Later: currency-aware price grouping (L7), avatar magic-byte check + stale file cleanup (L9), SSRF ranges + IPv4-mapped IPv6 (L8 part 1) | — |
| 2026-10-19 | Hygiene: GitHub Actions CI (typecheck + shared tests), shared types fixed (`is_public` removed, Profile `bio`/`birthday`), tsbuildinfo untracked | — |
| 2026-10-19 | Trust bugs: surprise mode enforced server-side (N1), claim rate limits + name checks (N3), `link_only` label/noindex/random slugs (N4), safe merge with feedback (N5), functions in `gru1` (N6), delete confirmation (N7); claim undo/release (N2, SQL applied by Gian) | #9 |
| 2026-10-19 | Email signup/login blocked on prod (captcha key missing from build); `+` usernames 404; OG image 500; ML listing links 500; duplicate lists on repeated taps; price rounding on edit; cross-device confirm message; mobile horizontal overflow | #7 |
| 2026-10-19 | Supabase captcha re-enabled and E2E test user deleted | — (Gian) |
| ≤ 2026-06 | OG image, post-claim nudge, `/{username}` profile page, avatar upload, merge, surprise toggle, privacy levels, ML extraction | #1–#6 |
