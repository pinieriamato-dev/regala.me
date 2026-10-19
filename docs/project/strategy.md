# regala.me — Strategy

*Last updated: 2026-10-19*

## What it is
A gift-list app for LATAM, Argentina first. The owner creates a list, pastes product links (Mercado Libre, Amazon,
Tiendanube…) to auto-fill items, and shares one link. Friends open it and claim a gift **without creating an
account**. Nobody shows up with the same thing.

Tagline: *"Tu lista de regalos, sin dramas."*

## Where we are
- Web live at www.regala.me (Next.js 15 + Supabase, Vercel). Native app paused.
- ~23 registered users (Oct 2026), mostly friends and family. Lists are mostly birthdays.
- Core loop works end to end (verified E2E, Oct 2026). See `ROADMAP.md` for open trust bugs.
- No analytics yet. Every growth decision is blind until G1/X2 in the roadmap are done.

## Positioning
**Lead with everyday occasions — cumpleaños + amigo invisible — not weddings.**
Weddings are crowded (Uniko, SEIV, store registries) and happen once in a lifetime. Birthdays and Secret Santa
happen every year, are viral (every gifter is a future creator), and are under-served.

> *"La lista para cualquier ocasión — cumple, amigo invisible, baby, casamiento. Pegás el link de Mercado Libre y listo."*

Our edge versus the direct clone (milistita.com):
1. **Brand.** The brutalist identity is far more memorable.
2. **Everyday occasions + amigo invisible.**
3. **Mercado Libre depth.** Paste-a-link that actually works.
4. **Iteration speed.**

## Core metric
**Viral coefficient** = new creators who first arrived as gifters ÷ active creators.
The gifter page footer and the post-claim nudge are the levers. Instrument this first (roadmap X2).

## Monetization (in order)
1. **Mercado Libre affiliates** (Afiliados y Creadores): commissions reported at ~5–24% depending on category.
   Invisible to users, so it's compatible with "sin comisión". Requires approval and monotributo.
2. **Premium per event** (wedding, quinceañera, baby shower): one-time ARS payment for a cover, invitation + QR, RSVP,
   custom URL and unlimited items. Local players show Argentines pay per event.
3. **Optional colecta** (group gift) via Mercado Pago: a small fee, or the giver chooses to cover it. Never mandatory.
4. Later: B2B (wedding planners, venues, baby stores).

Rule: the core stays free and we say so honestly ("hoy es gratis; si sumamos premium, lo básico se queda").
**Never** "gratis para siempre".

## Go-to-market (Argentina)
| When | Push |
|---|---|
| Now → mid-Nov | Fix trust bugs, add analytics, build amigo invisible. Seed with 20–50 friends; collect real testimonials. |
| Mid-Nov → Dec 24 | **Amigo invisible + Navidad** campaign: TikTok/Reels how-tos, office and friend-group chats. |
| Dec–Jan | Egresados, Reyes (Jan 6). |
| Mar–Apr | Evergreen birthday SEO. |
| Aug | Día del Niño. |
| Sep–Dec | Wedding season (premium). |
| Oct (3rd Sunday) | Día de la Madre. |

Channels:
- **WhatsApp:** the share card *is* the ad, so the OG image matters a lot.
- **Short video:** "pegá el link de Mercado Libre" demos, the "no more duplicate gifts" meme.
- **SEO:** per-occasion and comparison pages.
- **Communities:** novias/mamás Facebook groups, baby-shower planners, invitation designers.

Don't spend on ads until analytics show what the loop converts.

## Budget guide (first ~USD 1–2k)
| Item | Cost |
|---|---|
| Supabase Pro | $10/mo (current) |
| Vercel Pro (commercial use, analytics) | ~$20/mo |
| Resend | free tier → ~$20/mo |
| PostHog | free tier |
| Sentry | free tier |
| Defensive domains (regalame.com.ar / .com) | ~$10–40/yr each |
| Micro-influencer seeding for Navidad | ~$300–800 |
| Paid tests, only after the viral coefficient is measured | ~$300–500 |

## Open questions
- Hours per week and budget available?
- Monotributo for affiliate/premium income?
- Amigo invisible as *the* Navidad bet? (Recommended.)
