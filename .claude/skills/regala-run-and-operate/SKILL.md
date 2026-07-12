---
name: regala-run-and-operate
description: >
  Read this to RUN, BUILD, TYPECHECK, LINT, or (future) DEPLOY the regala.me monorepo, and to
  understand where build output lands and how data/URL artifacts (slug, public URL, sort_order,
  currency) are shaped. Load it when you see: "how do I start the web app / mobile app", "pnpm
  dev:web / dev:mobile", port 3000 vs 3001, "expo start" / Metro :8081, "turbo build", "how do I
  run tests" (there is NO root test script), Metro "_tmp_" watcher crash on Windows, "npx expo
  start --clear", questions about the public gifter URL format, why mobile items sort to the end,
  or hosting/deploy status (Supabase Pro sa-east-1, Vercel not deployed, EAS not configured).
  Do NOT load it to CHANGE env vars or keys (use regala-config-and-env), to write/run the test &
  QA gates in depth (regala-validation-and-qa), or to apply schema/infra changes through the
  approval path (regala-change-control).
---

Run, build, and operate the regala.me apps. For a zero-context mid-level engineer or a
Sonnet-class model who needs to get the apps running, understand the Turborepo task graph, and
know what data/URL artifacts the running app produces. All facts verified 2026-07-12.

Terms defined once: **Turborepo** = the `turbo` task runner that orchestrates per-package scripts.
**pnpm workspace** = the monorepo package manager; `--filter <pkg>` targets one package.
**Metro** = React Native's JS bundler (mobile). **Expo** = the RN toolchain the mobile app uses.
**RLS** = Postgres Row-Level Security (the DB-level auth boundary; details live in sibling skills).

---

## 0. First move in a fresh container: install

`node_modules` is NOT present in a fresh checkout. Every command below fails until you run this
once from the repo root `/home/user/regala.me`:

```bash
pnpm install          # resolves ~926 pkgs, ~15s (verified 2026-07-12)
```

Toolchain (verified): `packageManager: pnpm@9.12.0`, `engines.node >=20` (a node 20/22 line is
fine). Use `pnpm`, not `npm`/`yarn` — the lockfile and workspace protocol (`workspace:*`) are pnpm.

---

## 1. Command table (run from repo root unless noted)

| You want to… | Command | What actually runs | Where output/where it listens |
|---|---|---|---|
| Run web dev server | `pnpm dev:web` | `turbo run dev --filter=web` → `next dev --port 3000` | http://localhost:3000 (hot reload; no build artifact) |
| Run mobile dev (Metro) | `pnpm dev:mobile` | `turbo run dev --filter=mobile` → `expo start` | Metro bundler on :8081; scan QR / press `i`/`a` |
| Build everything | `pnpm build` | `turbo run build` | web → `apps/web/.next/`; mobile & shared have NO build |
| Typecheck everything | `pnpm typecheck` | `turbo run typecheck` (per-pkg `tsc --noEmit`) | no emit; pass/fail only |
| Typecheck one app | `pnpm --filter web typecheck` (or `mobile`, `shared`) | `tsc --noEmit` in that pkg | no emit |
| Lint everything | `pnpm lint` | `turbo run lint` → web `next lint`, mobile `expo lint` | lint report (`shared` has NO lint) |
| Run the test suite | `pnpm --filter shared test` | `vitest run` | 13 tests pass, 1 file, ~460ms (verified 2026-07-12) |

Root `package.json` scripts (verified): `dev:mobile`, `dev:web`, `build`, `lint`, `typecheck`.
**There is NO root `test` script.** Tests exist only in `packages/shared` — run them with the
`--filter shared` form above. Do not invent `pnpm test` at the root; it will error.

### Port 3000 vs 3001 (real gotcha)
The web `dev` script is literally `next dev --port 3000` (see `apps/web/package.json`). CLAUDE.md
§5 says "port 3000 often taken, use 3001". If 3000 is busy, run Next directly with a different port
from the web package:

```bash
cd /home/user/regala.me/apps/web && npx next dev --port 3001
```

Note the auth-flow fallback site URL in code is `http://localhost:3001` (used when
`NEXT_PUBLIC_SITE_URL` is unset). So email/OAuth redirect links assume 3001 in local dev. If you
run on 3000, auth redirect links may point at 3001 — set `NEXT_PUBLIC_SITE_URL` to match your port
(env changes are owned by **regala-config-and-env**).

---

## 2. Turborepo task graph and cache

From `turbo.json` (verified, exact):

```json
"build":     { "dependsOn": ["^build"], "outputs": [".next/**", "!.next/cache/**", "dist/**"] }
"dev":       { "cache": false, "persistent": true }
"lint":      {}
"typecheck": { "dependsOn": ["^build"] }
```

Read this as:
- `^build` = "build this package's workspace dependencies first." `build` and `typecheck` both
  declare it. In practice `packages/shared` has **no `build` script**, so `^build` is a no-op for
  it — shared is raw TypeScript, consumed directly (web sets `transpilePackages: ['shared']` in
  `next.config.ts`; mobile lets Metro transpile it). Do not add a `dist` build to `shared`
  expecting the pipeline to need it.
- `dev` is `cache:false` + `persistent:true` — long-running, never cached, holds the terminal.
- Cached `build` **outputs** are `apps/web/.next/**` (excluding `.next/cache`) and any `dist/**`.
  A warm turbo cache replays these without re-running `next build` — if you edited files and see
  no change, you may be seeing a cache hit; force a clean run with `pnpm build --force` or
  `turbo run build --force`.

Only `apps/web` produces a real build artifact (`next build` → `.next/`). `mobile` and `shared`
have no `build` script, so `pnpm build` effectively builds the web app.

---

## 3. Mobile bundler traps

`apps/mobile/metro.config.js` (verified) does three monorepo things: watches the repo root
(`watchFolders = [monorepoRoot]`), adds root `node_modules` to `nodeModulesPaths`, and — the
important trap — sets a `blockList`:

```js
config.resolver.blockList = [
  /node_modules\/.pnpm\/.*_tmp_\d+.*/,
]
```

This excludes the temporary `expo-splash-screen` `_tmp_XXXXX` directories that appear during pnpm
postinstall. Without it, Metro's watcher (notably on Windows / no Watchman) tries to watch dirs
that vanish and crashes. It is already configured — do not remove it.

If Metro still misbehaves (stale cache, "unable to resolve", ghost `_tmp_` watch), reset the
bundler cache by running Expo directly from the mobile package:

```bash
cd /home/user/regala.me/apps/mobile && npx expo start --clear
```

App identity (from `app.json`, verified): scheme `regalame`, iOS bundle / Android package
`me.regala.app`, `newArchEnabled: true`. Mobile Supabase session is AsyncStorage-backed.

---

## 4. Data / URL artifact conventions (what the running app produces)

You will see these shapes in the DB and in URLs while operating the app. Know them before you
"fix" something that looks wrong.

### Slug + public gifter URL
- Slugs are generated by `createSlug(title)` in `packages/shared/src/index.ts` (verified). It
  lowercases, strips accents (NFD + combining-mark strip) and non-`[a-z0-9\s]`, hyphenates spaces,
  truncates the text to 40 chars, then appends `'-' + Date.now().toString(36)` (a **base36
  timestamp**). Example: `"Mi Lista De Cumple"` → `mi-lista-de-cumple-<base36ts>`.
- The base36 suffix makes each slug effectively unique. The DB enforces uniqueness at
  `UNIQUE(owner_id, slug)` (constraint `wishlists_owner_id_slug_key`) — uniqueness is **per owner**,
  not global.
- Public gifter URL format: `regala.me/{username}/{slug}` — `username` comes from `profiles`, not
  the email prefix (a mobile bug once used the email prefix; fixed). Locally that is
  `http://localhost:<port>/{username}/{slug}`. The page 404s unless the wishlist's
  `privacy_level` is `public` or `link_only` (RLS + a `.in(...)` filter enforce this — see
  regala-validation-and-qa / regala-change-control for the privacy model).

### sort_order — web vs mobile inconsistency (real, verified)
- **Web** `addItem` (`apps/web/app/dashboard/actions.ts`) computes the next order as
  `sort_order: (topItem?.sort_order ?? -1) + 1` — i.e. DB max + 1 (small, dense integers). Its
  `mergeWishlists` re-numbers merged items with `offset + i`.
- **Mobile** `add-item.tsx` inserts `sort_order: Date.now()` — a huge millisecond timestamp.
- Consequence: an item added on mobile has an enormous `sort_order`, so it sorts to the **end** on
  web. This is a known low-priority inconsistency (CLAUDE.md gap #9), not a bug to hot-fix. Don't
  "align" it without change-control — the sort key affects display order of live lists.
- Display order everywhere: items are ordered `priority DESC, then sort_order`.

### Currency
- `wishlists.currency` defaults to `'ARS'` (Argentine peso) at the DB level; LATAM focus. Valid
  set: `ARS|BRL|MXN|CLP|COP|UYU|PEN|USD`. Currency lives on `wishlists`, **not on `items`** —
  inserting `currency` on an item errors (a mobile bug once did this; fixed). Keep currency at the
  list level.

---

## 5. Hosting & deploy status (verified 2026-07-12) — and the cost rule

| Component | Status | Notes |
|---|---|---|
| Supabase | LIVE, Pro plan **$10/mo**, region **sa-east-1** (São Paulo), project `esyybmnwalscpnzfeowh`, org "Piniei Amato Devs" | Backend for BOTH apps. **Never downgrade/pause without explicit user approval.** |
| Vercel (web hosting) | **NOT yet deployed** | No production web deploy exists. Free tier intended. There is no `vercel.json` deploy runbook here — do not invent deploy commands. |
| Expo EAS (mobile builds) | **NOT configured** | No EAS build/submit pipeline set up yet. Do not fabricate `eas build` steps as if they're wired. |

There is **no deploy command in this repo** today. `pnpm build` produces the web artifact locally;
shipping it to Vercel and configuring EAS are open/candidate tasks, not existing runbooks. If asked
to deploy, route it through **regala-change-control** — treat first-time hosting setup as an infra
change.

**Cost-transparency rule (CLAUDE.md §13, non-negotiable):** before any infrastructure change that
costs money — and specifically before any Supabase MCP `confirm_cost` call — state the dollar cost
explicitly to the user and get approval. Never silently upgrade a plan, add a paid add-on, or
change region.

> CLAUDE.md §13 is a bit stale on framing: it lists Vercel "not yet deployed" and EAS "not yet
> configured" — both still true as of 2026-07-12. The verified fact is above; do not edit CLAUDE.md
> except through regala-change-control.

---

## 6. robots.ts and sitemap.ts behavior (web SEO surface)

Both are Next.js metadata routes under `apps/web/app/` (verified).

- `robots.ts` → serves `/robots.txt`: `userAgent: '*'`, `allow: '/'`, and
  `disallow: ['/dashboard', '/auth', '/api']`. So the dashboard, auth pages, and API routes are
  excluded from crawling; public gifter pages are crawlable. `sitemap` points to
  `https://regala.me/sitemap.xml`.
- `sitemap.ts` → serves `/sitemap.xml`: queries Supabase server-side for wishlists with
  `privacy_level = 'public'` (note: **only `public`**, not `link_only`), newest first, `limit(1000)`,
  and emits `https://regala.me/{username}/{slug}` entries (`changeFrequency: 'daily'`,
  `priority: 0.8`) plus the homepage (`priority: 1`, `changeFrequency: 'weekly'`). It uses
  `createServerSupabase()` and the `profiles!inner(username)` join.
- Implication when operating: the sitemap only lists `public` lists. A `link_only` list is
  reachable by URL but intentionally NOT in the sitemap. If a public list is missing from
  `/sitemap.xml`, check its `privacy_level` and that its `profiles` join resolves (a missing
  profile row — e.g. an OAuth signup where the trigger didn't fire — drops it from the sitemap).
- Both hardcode the `https://regala.me` origin regardless of local port; that's expected in dev.

---

## When NOT to use this / use instead

| If you need to… | Use |
|---|---|
| Create/change `.env*`, Supabase keys, `HCAPTCHA_*`, `ML_CLIENT_*`, or understand which env var powers what | **regala-config-and-env** |
| Actually gate a change: run/author tests, QA the gifter flow, typecheck-as-a-CI-gate, reproduce a bug | **regala-validation-and-qa** |
| Apply a schema migration, enable Supabase Realtime/replication, do first-time Vercel/EAS setup, or anything needing approval / `confirm_cost` | **regala-change-control** |

This skill is about *running* what exists. It does not own the four non-negotiables, schema, or
the deploy approval path.

---

## Provenance and maintenance

All facts verified 2026-07-12 against the repo at `/home/user/regala.me` and the live Supabase
project `esyybmnwalscpnzfeowh`. Re-verify anything that can drift:

```bash
# Scripts & task graph
cat /home/user/regala.me/package.json /home/user/regala.me/apps/web/package.json \
    /home/user/regala.me/apps/mobile/package.json /home/user/regala.me/turbo.json

# Test count (expect 13 passing)
pnpm --filter shared test

# Typecheck gates (expect clean)
pnpm --filter web typecheck && pnpm --filter shared typecheck

# Slug generator + sort_order logic
sed -n '27,40p' /home/user/regala.me/packages/shared/src/index.ts
grep -n "sort_order" /home/user/regala.me/apps/web/app/dashboard/actions.ts \
    /home/user/regala.me/apps/mobile/app/add-item.tsx

# robots / sitemap
cat /home/user/regala.me/apps/web/app/robots.ts /home/user/regala.me/apps/web/app/sitemap.ts

# Metro blockList
cat /home/user/regala.me/apps/mobile/metro.config.js
```

Volatile facts to watch: hosting status (Vercel/EAS still undeployed?), Supabase plan/region/cost
(currently Pro / sa-east-1 / $10/mo — never change without user approval), and the web `dev` port
(still `--port 3000` in `apps/web/package.json`).
