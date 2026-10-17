---
name: regala-config-and-env
description: >
  The single source of truth for regala.me configuration: every environment variable
  (web + mobile), its default-in-code, what feature it turns on/off when unset, and the
  exact consuming file:line. Load this when creating/editing a `.env.local` or `.env`,
  when the app throws "supabaseUrl is required" / "Missing Supabase" / blank screen on
  boot, when captcha unexpectedly appears or is missing, when MercadoLibre catalog (`/p/`)
  extraction returns only a slug title, when standing up the repo from scratch (`pnpm
  install`, dev server won't start, port 3000 vs 3001), or when adding a NEW env var /
  config axis. In this codebase env vars ARE the feature flags (hCaptcha, ML OAuth), so
  this is also the flag catalog. Do NOT load for: schema/RLS/DB config (that's a DB skill),
  the product-extraction algorithm internals (regala-product-extraction), or day-to-day
  run/deploy operations (regala-run-and-operate).
---

One-line purpose: the complete, verified catalog of every configuration axis in regala.me
— what each env var does, its default, its graceful-degrade behavior, and how to recreate
the environment from an empty container. Written for a zero-context engineer or a
Sonnet-class model doing setup, debugging boot failures, or adding a config knob.

**Jargon defined once:**
- **env var** = an OS environment variable Next.js/Expo reads at build/runtime via
  `process.env.NAME`. In this repo, a few of them (`HCAPTCHA_SITE_KEY`, `ML_CLIENT_ID/SECRET`)
  double as **feature flags**: set ⇒ feature on; unset ⇒ feature silently off. There is no
  separate flag system.
- **graceful-degrade** = when a var is unset the app keeps working with reduced behavior
  (no crash), versus **prod-critical** = unset ⇒ the app cannot boot / core flow breaks.
- **publishable key** = Supabase's public anon-tier API key. It is not a secret in the
  RLS-bypass sense (Row-Level Security is the real boundary), but this repo still keeps it
  server-side only (no `NEXT_PUBLIC_` Supabase key exists).

---

## 1. Full env-var catalog

### Web — `apps/web/.env.local` (read server-side only)

| Var | Required? | Default in code | What breaks/changes when UNSET | Consuming file:line |
|-----|-----------|-----------------|--------------------------------|---------------------|
| `SUPABASE_URL` | **YES (prod-critical)** | none — `!` non-null assert | App cannot talk to Supabase; every server component/action/middleware call fails. `!` means TS won't catch it — you get a runtime error like `supabaseUrl is required`. | `apps/web/lib/supabase/server.ts:10`, `apps/web/middleware.ts:11` |
| `SUPABASE_PUBLISHABLE_KEY` | **YES (prod-critical)** | none — `!` non-null assert | Same as above — auth + all data access dead. | `apps/web/lib/supabase/server.ts:11`, `apps/web/middleware.ts:12` |
| `NEXT_PUBLIC_SITE_URL` | optional | **three different defaults** (see §3 trap) | Email confirm / password-reset / OAuth callback links + share links point at the wrong origin. | `apps/web/app/auth/actions.ts:60,101`; `apps/web/app/auth/google/route.ts:6`; `apps/web/app/dashboard/page.tsx:57,70,120`; `apps/web/app/dashboard/[id]/page.tsx` |
| `HCAPTCHA_SITE_KEY` | optional (**feature flag**) | unset ⇒ captcha **disabled** | The hCaptcha widget is not rendered and the server-side captcha guard is skipped. Signup/signin/reset still work without a captcha token. | `apps/web/app/auth/actions.ts:48,49,98,99`; `apps/web/app/auth/page.tsx:4` |
| `ML_CLIENT_ID` | optional (**feature flag**) | unset ⇒ ML OAuth **skipped** | MercadoLibre **catalog** (`/p/`) extraction can't call the authed `/products/` API → falls back to a slug-derived title (price+image null). Regular ML listings + generic sites are unaffected. | `apps/web/app/api/extract-product/route.ts:125` |
| `ML_CLIENT_SECRET` | optional (**feature flag**) | unset ⇒ ML OAuth **skipped** | Same as `ML_CLIENT_ID`; both must be set together. | `apps/web/app/api/extract-product/route.ts:126` |

> **CLAUDE.md §4 is stale here:** it documents only `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
> `NEXT_PUBLIC_SITE_URL`. `HCAPTCHA_SITE_KEY`, `ML_CLIENT_ID`, and `ML_CLIENT_SECRET` are **real
> and in use** (verified 2026-07-12) but undocumented there. Do not fix CLAUDE.md directly —
> route that through the change-control skill (see §5).

**Notes that matter:**
- There is **no `NEXT_PUBLIC_` Supabase key** — all Supabase access is server-side (commit
  c097e16). The publishable key is handed to `@supabase/ssr`'s server client; RLS is the
  security boundary, but the architecture deliberately keeps the key off the client.
- The **hCaptcha SECRET** is NOT an app env var — it lives in the Supabase Auth dashboard.
  The app only holds the SITE key, and only to decide whether to render/require the widget.
  So enabling captcha is a two-place change: set `HCAPTCHA_SITE_KEY` here AND configure the
  secret in Supabase Auth.

### Mobile — `apps/mobile/.env`

| Var | Required? | What breaks when UNSET | Consuming file:line |
|-----|-----------|------------------------|---------------------|
| `EXPO_PUBLIC_SUPABASE_URL` | **YES (prod-critical)** | Mobile Supabase client can't init (`!` assert) → auth + data dead. | `apps/mobile/lib/supabase.ts:5` |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **YES (prod-critical)** | Same. | `apps/mobile/lib/supabase.ts:6` |

`EXPO_PUBLIC_` is Expo's convention for vars inlined into the client bundle at build time
(unlike web, mobile has no server; these are shipped in the app). That is expected and safe
because RLS is the boundary.

---

## 2. Prod-critical vs graceful-degrade (at a glance)

| Var | Class | Unset behavior |
|-----|-------|----------------|
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (web) | prod-critical | hard failure at first Supabase call |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (mobile) | prod-critical | hard failure at client init |
| `NEXT_PUBLIC_SITE_URL` | degrade | falls back to a hardcoded default; links may point at the wrong host |
| `HCAPTCHA_SITE_KEY` | degrade (flag) | captcha silently off; auth still works |
| `ML_CLIENT_ID` + `ML_CLIENT_SECRET` | degrade (flag) | ML catalog extraction falls back to slug title; everything else works |

The only vars that can take the app down are the four Supabase vars. Everything else fails
soft. This is by design — the app must be demoable with just Supabase creds.

---

## 3. Known config/env traps

1. **Port 3000 vs 3001.** `apps/web/package.json` `dev` script is `next dev --port 3000`.
   CLAUDE.md §5 warns 3000 is often taken. If you run on 3001, note that `handleAuth` and
   `requestPasswordReset` fall back to `http://localhost:3001` when `NEXT_PUBLIC_SITE_URL`
   is unset (`apps/web/app/auth/actions.ts:60,101`) — so email links will use 3001. If your
   dev server is actually on 3000, set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` or the
   confirm/reset links will point at a dead port.

2. **`NEXT_PUBLIC_SITE_URL` has THREE different fallbacks** — do not assume one:
   - auth actions (signup/reset email links): `?? 'http://localhost:3001'`
   - Google OAuth route: `?? origin` (the incoming request's origin), then **trailing slash
     stripped** via `.replace(/\/$/, '')` (`apps/web/app/auth/google/route.ts:6`)
   - dashboard share links: `?? 'https://regala.me'` (`apps/web/app/dashboard/page.tsx:57`)

   Consequence: a **trailing slash** in `NEXT_PUBLIC_SITE_URL` is only stripped in the Google
   route. Set it with **no trailing slash** (e.g. `https://regala.me`, not
   `https://regala.me/`) or auth-callback / share URLs get a double slash.

3. **The sandbox blocks writing `.env*` files.** You (or a tool) cannot Write/Edit them.
   Create them by hand with `printf` in bash. **NEVER use PowerShell backtick syntax** — it
   wraps lines and corrupts the key. See §4 for the exact commands.

4. **Metro `blockList` (mobile).** `apps/mobile/metro.config.js` excludes
   `node_modules/.pnpm/.*_tmp_\d+.*` to stop a Windows/expo-splash-screen tmp-watch crash.
   This is config, not env — don't remove it. If Metro still misbehaves, run
   `npx expo start --clear` from `apps/mobile/`.

5. **`node_modules` is not in a fresh container.** Any typecheck/dev/test needs
   `pnpm install` first (see §4).

---

## 4. Recreate-from-scratch runbook (empty container → running dev)

Do these in order from the repo root `/home/user/regala.me`.

```bash
# 0. Prereqs (verified 2026-07-12): node >= 20, pnpm 9.12.0.
node -v            # need >= v20 (repo engines.node ">=20"; local ran v22.x)
corepack enable    # if pnpm missing; repo pins packageManager: pnpm@9.12.0
pnpm -v            # expect 9.12.0

# 1. Install all workspaces (~15s, resolves ~926 pkgs). Required before anything else.
pnpm install

# 2. Create the WEB env file by hand (sandbox blocks writing .env*; use printf, NOT PowerShell).
#    Replace <...> with real values — get the publishable key from Supabase dashboard
#    (project esyybmnwalscpnzfeowh) or via MCP get_publishable_keys. DO NOT paste secrets here.
printf 'SUPABASE_URL=https://esyybmnwalscpnzfeowh.supabase.co\nSUPABASE_PUBLISHABLE_KEY=<publishable key>\nNEXT_PUBLIC_SITE_URL=http://localhost:3001\n' > apps/web/.env.local

# 3. Create the MOBILE env file the same way.
printf 'EXPO_PUBLIC_SUPABASE_URL=https://esyybmnwalscpnzfeowh.supabase.co\nEXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>\n' > apps/mobile/.env

# 4. (Optional) enable feature flags by appending to apps/web/.env.local:
#    HCAPTCHA_SITE_KEY=<site key>          # also set the SECRET in Supabase Auth dashboard
#    ML_CLIENT_ID=<id>                     # both ML_* needed together for /p/ catalog extraction
#    ML_CLIENT_SECRET=<secret>

# 5. Verify without a browser (cheapest gate):
pnpm --filter web typecheck        # tsc --noEmit, should be clean
pnpm --filter shared test          # vitest, 13 tests pass (~460ms)

# 6. Start dev:
pnpm dev:web                       # next dev --port 3000 (use 3001 if 3000 taken — see §3 trap 1)
pnpm dev:mobile                    # expo start (Metro :8081)
```

- If port 3000 is taken: `cd apps/web && npx next dev --port 3001` and set
  `NEXT_PUBLIC_SITE_URL=http://localhost:3001` to keep email/callback links correct.
- Minimum to boot: only the two Supabase vars per app. Skip step 4 entirely for a basic run
  (captcha off, ML catalog extraction degraded).

---

## 5. How to add a new env var / config axis (checklist)

Follow every step — a half-added flag that has no unset-guard is the classic way to turn a
graceful-degrade knob into a prod-critical crash.

- [ ] **Read the var with an explicit unset-guard.** For an optional flag, branch on presence
      (`const key = process.env.FOO; if (!key) { /* degrade */ }`) exactly like
      `HCAPTCHA_SITE_KEY` (`auth/actions.ts:48-49`) and `ML_CLIENT_ID/SECRET`
      (`extract-product/route.ts:125-127`). Only use the `!` non-null assert for a truly
      prod-critical var (the Supabase four) — and know it moves the failure to runtime.
- [ ] **Pick the right prefix.** Web server-only ⇒ bare name (`FOO`). Web value that must
      reach the browser ⇒ `NEXT_PUBLIC_FOO` (and understand it is then public). Mobile ⇒
      `EXPO_PUBLIC_FOO` (always shipped in the bundle).
- [ ] **Default sensibly and consistently.** If you fall back, use ONE default across all
      consumers — the `NEXT_PUBLIC_SITE_URL` three-default mess (§3 trap 2) is the anti-pattern
      to avoid.
- [ ] **Never commit the value.** `.env`, `.env.local`, `apps/web/.env*`, `apps/mobile/.env*`
      are git-ignored (`.gitignore:15-20`) and sandbox-blocked. Add the var only to the local
      `.env` files via `printf`.
- [ ] **Document it in CLAUDE.md §4 — via change-control, not a direct edit.** Route the doc
      update through the regala-change-control skill. Include: name, required/optional,
      default-in-code, unset behavior, consuming file.
- [ ] **Re-verify the catalog** (one-liner in §Provenance) so the new var shows up.
- [ ] **If the "config" is actually a schema/replication change** (e.g. enabling Supabase
      Realtime on `claims`), that is NOT an env var — it goes through the DB/migration
      change-control path, not this file.

---

## When NOT to use this / use instead

- **Database, schema, RLS, or migration config** (privacy_level, `claims` uniqueness, enabling
  Realtime replication) → the DB/schema skill and **regala-change-control**. Env vars here do
  not configure the database.
- **The MercadoLibre / OpenGraph extraction algorithm itself** (how titles/prices are parsed,
  SSRF guards, redirect hops) → **regala-product-extraction**. This file only covers the two
  env vars (`ML_CLIENT_ID/SECRET`) that gate it.
- **Running, deploying, or operating the app day-to-day** → **regala-run-and-operate**. This
  file's §4 is the one-time recreate-from-scratch bootstrap, not the ongoing ops runbook.
- **Changing CLAUDE.md or any documented convention** → **regala-change-control**. Never edit
  CLAUDE.md directly from here.

Build/install/dev-command knowledge is intentionally merged into this skill (§4) — there is no
separate regala-build skill.

---

## Provenance and maintenance

All facts verified 2026-07-12 against the repo at `/home/user/regala.me` (files re-read this
session: `apps/web/lib/supabase/server.ts`, `apps/web/middleware.ts`,
`apps/web/app/auth/actions.ts`, `apps/web/app/auth/page.tsx`, `apps/web/app/auth/google/route.ts`,
`apps/web/app/api/extract-product/route.ts`, `apps/web/app/dashboard/page.tsx`,
`apps/mobile/lib/supabase.ts`, `.gitignore`, `package.json` files) and the ground-truth dossier.

Re-verify anything that can drift with these one-liners (from repo root):

```bash
# Complete list of env vars actually read in code (the authoritative catalog):
grep -rhoE 'process\.env\.[A-Z_]+' apps/ | sort -u

# Confirm the web dev port + pnpm/node pins:
grep -nE '"dev"|packageManager|"node"' package.json apps/web/package.json apps/mobile/package.json

# Confirm .env files stay git-ignored:
grep -nE '\.env' .gitignore
```

**Uncertain / candidate (flagged, not asserted):**
- Whether `HCAPTCHA_SITE_KEY` and `ML_CLIENT_ID/SECRET` are currently *set in production* is
  not verifiable from the repo (values live only in untracked `.env.local` / the host env).
  This skill documents their code behavior, not their live deployment state.
- The Supabase publishable key value is never printed here by design; fetch it from the
  Supabase dashboard or MCP `get_publishable_keys` when populating `.env` files.
