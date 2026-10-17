---
name: regala-research-frontier
description: >
  Read this to understand WHERE regala.me could advance beyond the state of the art (SOTA) and what
  the FIRST concrete steps in THIS repo are. Load it when the task is framed as research, "beyond
  SOTA", "our moat", "the viral loop", "gifter-to-creator conversion", "why would this go viral",
  "measure the funnel", "instrument the nudge", "A/B the post-claim card", or "extraction accuracy
  benchmark". Also load it when someone points at `apps/web/app/[username]/[slug]/claim-button.tsx`
  (the post-claim nudge) or the viral footer in `[username]/[slug]/page.tsx` and asks "does this
  actually convert?". Primary frontier: frictionless viral mechanics (the no-account claim + 5-second
  post-claim nudge). Secondary: LATAM URL extraction accuracy. Do NOT load this to actually RUN an
  experiment end-to-end (that is regala-research-methodology), to change the extraction algorithm
  (regala-product-extraction), or to build the realtime claim feature (regala-realtime-claims-campaign).
  This skill names the open problems and the entry points; it does not ship any capability.
---

One-line purpose: this is the **map of open problems** where regala.me might beat the state of the art, for an engineer or model deciding what research-shaped work is worth doing and how to start it inside this repo. It names frontiers, the specific asset regala.me holds, the first three repo steps, and a falsifiable "you have a result when…" bar for each. It ships nothing.

> **Reality check, read first.** Nothing described here is a shipped capability. The single most important fact: **there is NO analytics or event capture anywhere in this codebase today** (verified 2026-07-12 by grep for `analytics|posthog|gtag|mixpanel|track(|@vercel/analytics|plausible` across `apps/**/*.{ts,tsx,json}` → zero matches). So the viral loop is currently **unmeasured**. Every conversion claim below is a hypothesis, not a number. Step 1 of the primary frontier is *building the measurement*, not tuning the loop.

---

## The four non-negotiables still bind every frontier

Research does not get a pass on the project's hard rules. Before proposing anything here, re-read `regala-change-control` for the full statements. In short:

1. **Zero-friction claims.** A gifter MUST NEVER be required to sign up to claim. No frontier may add an account wall, an email gate, or a captcha to the claim path. (The whole viral thesis *depends* on this being true.)
2. **Schema changes only via Supabase MCP migrations**, documented in CLAUDE.md §3 in the same change. An analytics table is a schema change → change-control.
3. **Never commit `.env`/secrets.** Any analytics key (e.g. a PostHog project key) is env config, created by hand, never committed.
4. **Design-system purity (web).** Any new UI (an A/B variant of the nudge) uses `rg-*` classes / CSS vars — no blur, no rounded corners beyond 4px. Do not imitate `dashboard/new/page.tsx` (a known raw-Tailwind violator).

---

## Frontier 1 — Frictionless viral mechanics *(PRIMARY, user-selected; open/candidate)*

### The thesis
regala.me's beyond-SOTA ambition is a **measurably higher gifter→creator conversion rate** driven by two assets competitors structurally lack:

- **The no-account claim.** A gifter claims a gift with only `claimer_name` (text) — no signup, no email. RLS policy `claims."Anyone can claim"` (INSERT, roles `{public}`, WITH CHECK `true`) makes this work at the database layer. That means the highest-intent moment (a person who just committed to buying a gift) happens *inside our product*, on our page, with zero friction spent.
- **The 5-second post-claim window.** The instant after a successful claim, the gifter is warm — they just watched the product work. That is the moment to convert them into a *creator* of their own list.

Both assets already exist in code:

| Asset | File · line (verified 2026-07-12) | What it is |
|---|---|---|
| No-account claim | RLS `claims."Anyone can claim"` (§1 non-negotiable) + `claim-button.tsx` form asks only `name` | Gifter claims with just a name |
| Post-claim nudge | `apps/web/app/[username]/[slug]/claim-button.tsx:20-40` | On `state?.success`, renders a yellow `rg-*` card: **"¿TENÉS UN CUMPLE PRÓXIMAMENTE?"** / "Armá tu lista en 2 min →", linking `href="/auth?mode=signup"` (line 27) |
| Passive viral footer | `apps/web/app/[username]/[slug]/page.tsx:135-148` | Bottom-of-page dark card **"¿QUERÉS HACER TU PROPIA LISTA?"** → `CREAR LISTA GRATIS →`, linking `href="/"` (line 145) |

Note the two CTAs point to **different destinations** (`/auth?mode=signup` vs `/`) — that difference matters when you attribute conversions.

### Why current SOTA falls short
- **Account walls kill the loop.** Mainstream wishlist/registry tools (the SOTA regala.me is measured against) require the gifter to create or log into an account to reserve/claim an item. Every wall drops intent. regala.me's claim path has no wall — so the referral impression lands on a fully-engaged user instead of one bouncing off a signup form.
- **The 7-month gift→birthday decay.** Documented in `TODOS.md` ("Post-claim inline viral nudge" → *Why*): a gifter claims in April, but their *own* birthday is in November. The passive footer 400px down the page is a weak nudge across a 7-month intent gap. The bet is that catching the user in the warm 5-second window (post-claim nudge) converts far better than the passive footer — **but this has never been measured** (no analytics; see Reality check).
- Nobody in this category, as far as this repo knows, has *published* a measured no-account-claim → creator conversion rate. That absence is the opening: a credible measured number would itself be a result.

### First THREE concrete steps IN THIS REPO
Do them in order. Step 1 is unavoidable because the funnel is currently dark.

1. **Instrument the funnel — add event capture (this does not exist yet).**
   There is nothing to A/B until you can count. Define three funnel events and emit them:
   - `gifter_view` — gifter page loaded (`[username]/[slug]/page.tsx`).
   - `claim_succeeded` — the `state?.success` branch in `claim-button.tsx:20`.
   - `nudge_clicked` — click on the post-claim CTA (`claim-button.tsx:27`, the `/auth?mode=signup` link) — and, separately, `footer_clicked` on the passive footer (`page.tsx:145`) so you can compare the two placements.
   Then close the loop to a completed signup (the existing auth flow lands via `app/auth/callback/route.ts`; attribute a new signup back to the referring gifter view).
   - **This is a real change → route it through `regala-change-control`.** Choosing the mechanism (a hosted analytics SDK vs. a first-party events table) is a decision, not a default. A first-party `events` table is a **schema change** (non-negotiable #2 → Supabase MCP migration + CLAUDE.md §3). Any hosted-analytics key is **env config** (#3 → never committed). Emitting from a Server Component/Action must not leak PII or block the render path.
   - Keep it off the claim's critical path: the claim must still succeed if analytics fails (non-negotiable #1 — never let instrumentation add friction or a failure mode to claiming).

2. **A/B the post-claim nudge (copy + placement).** Once events flow, vary the `claim-button.tsx:20-40` done-state: e.g. current copy vs. an occasion-anchored variant, CTA-to-`/auth?mode=signup` vs. a lighter "save this idea" path, nudge-only vs. nudge+footer. Keep every variant `rg-*`-pure (non-negotiable #4). Hold the claim path itself constant.

3. **Measure gifter→creator conversion and compare against the passive-footer baseline.** Compute `signups_attributed / claim_succeeded` for the nudge, and separately for the footer. The footer (`page.tsx:145`) is your control/baseline — it existed first and is passive.

For the mechanics of running the experiment properly (sample size, attribution window across the 7-month decay, avoiding p-hacking, how to actually wire an SDK/table), hand off to **`regala-research-methodology`** — this skill defines *what* to measure, that skill defines *how* to get a trustworthy number.

### Falsifiable milestone — "you have a result when…"
> On **real traffic**, with the funnel instrumented, you have a **statistically credible measured** gifter→creator conversion rate for the post-claim nudge, and it **beats the passive-footer baseline** by a margin larger than the confidence interval. A null or negative result (nudge ≤ footer) is also a valid result — it falsifies the "5-second window wins" hypothesis. "We shipped a prettier nudge" is **not** a result; a number with error bars is.

---

## Frontier 2 — LATAM URL extraction accuracy *(SECONDARY; open/candidate)*

### The thesis
"Paste a link → we fill the item" is regala.me's stated product differentiator (CLAUDE.md §11, §14). The asset here is the **extraction pipeline that already handles LATAM-specific hard cases** competitors' naive OG scrapers do not: a MercadoLibre (the dominant LATAM marketplace) fast path with a real product API + OAuth token, per-country item-id handling (MLA=AR, MLB=BR, MLM=MX, MLC=CL, MCO=CO, MLU=UY…), an SSRF/DNS guard, redirect re-validation, and honest bot-block detection. See `regala-product-extraction` for the full algorithm; the entry point is `apps/web/app/api/extract-product/route.ts`.

### Why current SOTA falls short
- Generic OG-tag scrapers return only a site name on bot-protected pages and miss price entirely on JS-heavy catalog pages.
- **MercadoLibre catalog `/p/` pages** are the known weak spot: Vercel datacenter IPs are geo-blocked by ML, so catalog extraction degrades to a Title-Cased URL slug (no price, no image) unless `ML_CLIENT_ID`/`ML_CLIENT_SECRET` OAuth creds are set (verified partial state, dossier §8). This degradation is currently **anecdotal, not measured** — there is no benchmark saying how often extraction succeeds.

### First THREE concrete steps IN THIS REPO
1. **Fix a benchmark URL set.** Assemble a frozen list of real LATAM product URLs spanning the hard cases: ML regular listings, ML catalog `/p/` pages, non-ML retailers (bot-protected and not), across countries (AR/BR/MX/CL/CO/UY). Store it as a test fixture, not scattered in prose.
2. **Score each URL against the live pipeline.** Call the extraction path per URL and record success = did it return usable `{title, price, image_url}` (the client's own success bar in `add-item-form.tsx` is "title|description|price|image_url present"). Note: `/api/extract-product` requires an authed session (401 otherwise), so drive it with a session cookie or call the ML/OG helper targets directly (dossier §12).
3. **Report a per-category success-rate table and identify the largest failure bucket** (expected: ML catalog `/p/` without OAuth creds). That table is the artifact.

### Falsifiable milestone — "you have a result when…"
> You have a **repeatable extraction success-rate benchmark** over the fixed LATAM URL set, broken down by category, that can be re-run to detect regressions — and you can state, with a number, which category is the bottleneck. "Extraction feels better" is not a result; "success rate on ML `/p/` pages went from X% to Y% on the frozen set" is.

---

## When NOT to use this / use instead

| If you are… | Use instead |
|---|---|
| Actually running an experiment (sample size, attribution, wiring the SDK/table, avoiding bad stats) | `regala-research-methodology` |
| Changing the extraction algorithm / debugging `/api/extract-product` | `regala-product-extraction` |
| Building the realtime claim-sync feature (the *flagship hard problem*, distinct from viral mechanics) | `regala-realtime-claims-campaign` |
| Deciding whether a proposed change is allowed to merge / needs a migration | `regala-change-control` |
| Writing the Spanish nudge/CTA copy itself | `regala-docs-and-writing` |

This skill picks the problems. Those skills do the work.

---

## Provenance and maintenance

Verified 2026-07-12 against the repo at `/home/user/regala.me` and the dossier (repo + live Supabase, same date).

- **No analytics exists** — re-verify (a match here invalidates "Step 1 is to build measurement"):
  `rg -n 'analytics|posthog|gtag|mixpanel|@vercel/analytics|plausible|track\(' apps packages`
- **Post-claim nudge still in the success branch**, still links to `/auth?mode=signup`:
  `rg -n 'auth\?mode=signup|CUMPLE PRÓXIMAMENTE' apps/web/app/\[username\]/\[slug\]/claim-button.tsx`
- **Passive viral footer** still links to `/`:
  `rg -n 'QUERÉS HACER|CREAR LISTA GRATIS' apps/web/app/\[username\]/\[slug\]/page.tsx`
- **No-account claim RLS policy** unchanged (`Anyone can claim`, WITH CHECK true):
  Supabase MCP `execute_sql`: `select policyname, cmd, with_check from pg_policies where tablename='claims';`
- **Extraction entry point** unchanged: `apps/web/app/api/extract-product/route.ts` exists and requires auth.

CLAUDE.md notes: CLAUDE.md §12 lists "no push notifications when all items claimed" and §14 frames virality only via the footer/nudge — it does **not** mention analytics, because none exists. That is accurate as of 2026-07-12; do not add an analytics claim to CLAUDE.md except through `regala-change-control` (docs-and-writing + change-control own CLAUDE.md edits).
