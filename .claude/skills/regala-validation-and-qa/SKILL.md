---
name: regala-validation-and-qa
description: >
  Load this to decide whether a regala.me change is ALLOWED TO MERGE and to know what "tested"
  means in this repo. Use when asked "is this ready to ship?", "did you test it?", "what's the
  acceptance criteria?", "add a test", "write a unit test", "increase coverage", or when
  reviewing a PR/diff before merge. Covers: the real test reality (the ONLY automated suite is
  `packages/shared` vitest, 13 tests), the pre-merge evidence gate (typecheck + shared test +
  manual critical-path + Supabase advisors + secrets + design purity), the manual QA checklist
  for flows that have NO automated coverage (signup, claim, surprise mode, privacy), how to add a
  vitest test to `shared`, and where automated coverage is missing. NOT for actively debugging a
  live bug (use regala-diagnostics-and-verification) or for how to run/build the apps
  (regala-run-and-operate).
---

# regala.me — Validation & QA

**What this is for:** the single source of truth on what counts as evidence that a change works
here, the acceptance threshold a change must clear before merge, the manual critical-path
inventory (the flows nothing automated covers), and how to add a test. Read it before you claim a
change is "done", before you approve a diff, and whenever someone asks you to "add a test".

**Audience:** a mid-level engineer or a Sonnet-class model with zero prior context on this repo.

Jargon defined once, on first use:
- **typecheck** — running the TypeScript compiler in check-only mode (`tsc --noEmit`); it compiles
  nothing to disk, it just fails if types are wrong. This is the cheapest real gate in the repo.
- **vitest** — the test runner used by `packages/shared`. `vitest run` executes once and exits
  (as opposed to watch mode).
- **critical path** — a user flow that, if broken, breaks the product (e.g. "a gifter can claim").
- **advisor** — Supabase's static security/performance linter, run via the Supabase MCP
  `get_advisors` tool. It reports `ERROR`/`WARN` findings on your database.
- **RLS** — Row-Level Security, Postgres policies that decide which rows each role can read/write.
  In this app RLS is the real security boundary (see `regala-architecture-contract`).

---

## When NOT to use this / use instead

| You are... | Use instead |
|---|---|
| Chasing a specific live bug / stack trace / reproducing a failure | `regala-diagnostics-and-verification` |
| Trying to start/build/run the web or mobile app | `regala-run-and-operate` |
| About to change DB schema, RLS, or anything needing sign-off | `regala-change-control` |
| Wondering why a past bug happened / whether it's settled | `regala-failure-archaeology` |
| Enforcing the four non-negotiables / architecture rules | `regala-architecture-contract` |

This skill assumes the change is written and you need to decide **"can it merge?"** and **"what
did I actually verify?"**.

---

## 1. The current test reality (state this honestly)

There is **exactly one automated test suite in the entire monorepo.** Do not overstate coverage.

| Fact | Value (verified 2026-07-12) |
|---|---|
| Automated test suites | **1** — `packages/shared` only |
| Runner | vitest `^4.1.8` (`packages/shared/package.json`), no config file (uses defaults) |
| Test file | `packages/shared/src/__tests__/index.test.ts` |
| Test count | **13 tests, 1 file, all passing** (~220ms) |
| What they cover | pure functions only: `createSlug` (4), `occasionEmoji` (4), `daysUntil` (5) |
| Root `test` script | **none** — root `package.json` has dev/build/lint/typecheck, no `test` |
| `apps/web` tests | **none** (no `test` script, no test files) |
| `apps/mobile` tests | **none** (no `test` script, no test files) |
| Everything else | verified by **typecheck + manual QA only** |

Run the suite:

```bash
pnpm --filter shared test          # → "Tests  13 passed (13)"
```

The 13 tests exercise `daysUntil` (returns `en N días` / `¡Hoy!` / null), `occasionEmoji`
(maps `OccasionId` → emoji, defaults `🎁`), and `createSlug` (lowercase kebab-case, accent
stripping, unique base36 suffix) — all defined in `packages/shared/src/index.ts`.

**Consequence:** for any change to `apps/web`, `apps/mobile`, server actions, RLS, or product
extraction, "the tests pass" is **not** sufficient evidence — those code paths have no automated
tests. You MUST typecheck and manually exercise the critical path. See §2 and §3.

---

## 2. The evidence bar — the pre-merge acceptance gate

A change may merge only when **every** applicable row below is green. Treat this as a checklist;
paste the results into the PR description. Prerequisite: `pnpm install` must have run in the
container (a fresh container has no `node_modules`, so every gate below fails until you install).

| # | Gate | Command | Pass condition |
|---|---|---|---|
| 1 | Web typechecks | `pnpm --filter web typecheck` | `tsc --noEmit` exits 0, no errors |
| 2 | Shared typechecks | `pnpm --filter shared typecheck` | exits 0 |
| 3 | Mobile typechecks | `pnpm --filter mobile typecheck` | exits 0 |
| 4 | Shared tests green | `pnpm --filter shared test` | **13/13 passed** (or more, if you added tests — never fewer, never skipped) |
| 5 | Manual critical path | see §3 checklist | the flows your change touches pass by hand |
| 6 | Supabase advisors | Supabase MCP `get_advisors` (security + performance) | **no NEW `ERROR`**; the 3 known WARNs are accepted (see below) |
| 7 | No secrets committed | `git diff --staged` / grep for keys | no `.env*`, no publishable key, no `ML_*`/`HCAPTCHA_*` literals |
| 8 | Design purity (web UI changes only) | eyeball + `regala-architecture-contract` | no blur, no radius > 4px, `rg-*` classes/CSS vars, not stray Tailwind |

Notes on individual gates:

- **You can typecheck all three at once** from the repo root: `pnpm typecheck` runs
  `turbo run typecheck` across web, shared, and mobile. Running them individually (rows 1-3) gives
  clearer per-app output when one fails. `turbo`'s `typecheck` task `dependsOn: ["^build"]`, but
  `shared` has no `build` script (its `main` is raw TS, consumed by web via `transpilePackages`),
  so there is nothing to prebuild — the typecheck just runs.
- **Gate 4 discipline:** the baseline is 13. If your change legitimately adds tests, the new number
  is the baseline. Never merge with fewer passing than before, and never merge with a `.skip`/`.todo`
  left in to make the suite go green. A red or skipped test is a failed gate, full stop.
- **Gate 6 — the three KNOWN, ACCEPTED advisor WARNs** (do NOT try to "fix" these; they are
  intentional — see `regala-architecture-contract`):
  1. `rls_policy_always_true` on the `claims` INSERT policy `Anyone can claim` — intentional; the
     no-account claim is a non-negotiable.
  2. `anon_security_definer_function_executable` on `handle_new_user` — the signup trigger.
  3. `authenticated_security_definer_function_executable` on `handle_new_user` — same trigger.
  Your job at gate 6 is to confirm your change introduced **no new** finding, especially no
  `ERROR`-level finding and no "table without RLS". If it did, route through `regala-change-control`.
- **Gate 7:** `.env`, `.env.local`, `apps/web/.env*`, `apps/mobile/.env*` are git-ignored and the
  sandbox blocks writing them. Never paste a real key into source. See `regala-config-and-env`.
- **Gate 8** applies only to web UI diffs. `apps/mobile` uses a different (pre-brutalist) palette by
  design; `apps/web/app/dashboard/new/page.tsx` is a KNOWN design-system violator (raw Tailwind) —
  do not imitate it and do not "fix" it as a drive-by.

> There is no CI in this repo that enforces these gates for you. You are the gate. If you did not
> run a command, do not report it as passed.

---

## 3. Manual critical-path QA checklist (the flows with NO automated coverage)

Everything below is verified by hand only — there is not one automated test for any of it. Walk the
flows your change could plausibly affect. Run against a local dev server (`regala-run-and-operate`
covers startup; web dev is `next dev`, port 3000 or 3001). Argentine Spanish (voseo) copy is
intentional.

| # | Flow | Steps | Expected |
|---|---|---|---|
| 1 | Signup → confirm → signin | Sign up with email+password (min 6 chars, letters AND numbers) → open confirmation email link → sign in | Unconfirmed users are signed out with an error; only confirmed users reach `/dashboard` |
| 2 | Create list | Dashboard → create wishlist (title, occasion, currency default ARS, privacy_level default `public`) | List created, redirect to `/dashboard/[id]`; no error about `is_public` (that column does NOT exist — see §5) |
| 3 | Add item + URL extraction | Add item; paste a product URL (e.g. a MercadoLibre listing) → fields auto-fill | Title/price/image pre-fill on success; honest error if extraction returns nothing. See `regala-product-extraction` |
| 4 | LATAM price entry | In add-item, type `66.500` and `1.234,56` | Saved as `66500` and `1234.56` — NOT `66.5`. (Web input is `type="text" inputMode="decimal"`, normalized in Zod) |
| 5 | Public gifter view as ANON | Open `regala.me/{username}/{slug}` in a logged-OUT browser (or incognito) | Page renders; items visible; viral footer "¿QUERÉS HACER TU PROPIA LISTA?" present |
| 6 | Claim without an account | As anon, claim an item entering only `claimer_name` | Claim succeeds with no signup; item shows claimed; the acting browser updates without reload |
| 7 | Duplicate / second claim | Claim an already-claimed item (or two browsers race the same item) | Losing claim shows the friendly message "¡Ya alguien lo reclamó! Elegí otro regalo." (Postgres `23505` from `UNIQUE(item_id)`) |
| 8 | Surprise mode hides claims | On a list with `is_surprise = true`, view as the OWNER | Claims are hidden from the owner (surprise preserved); owner sees the surprise banner |
| 9 | Private list → 404 for anon | Set a list `privacy_level = 'private'`, open its public URL logged out | `notFound()` / 404. `public` and `link_only` render; `private` does not for anon |
| 10 | Merge lists | Dashboard → merge two wishlists (`mergeWishlists` action) | Items combine onto the target; no orphaned items; ownership enforced |
| 11 | Avatar / profile edit | Profile → edit display name / bio / birthday; upload avatar | Profile updates; avatar upload writes `profiles.avatar_url`. ⚠️ The `avatars` storage bucket existence is UNVERIFIED (open/candidate) — if upload 500s with "Revisá que el bucket exista y tenga políticas de carga", the bucket/policies are missing, not your code. Verify before blaming the diff |

For flows 5-9 the key discipline is **test as ANON** (logged out). The gifter route hits Supabase
with no user, so anything the owner can see but anon cannot is an RLS gap, not a UI bug. To inspect
what anon should see, use `regala-diagnostics-and-verification`.

Report manual QA honestly: list which of these you actually clicked through. "Should work" is not
evidence.

---

## 4. How to ADD a vitest test to `shared`

New automated tests go in `packages/shared` today (it is the only place wired for tests). Add tests
here when you add or change a **pure function** in `packages/shared/src` (e.g. a new helper in
`index.ts` or `types.ts`).

**Location & naming:** tests live under `packages/shared/src/__tests__/`. The existing file is
`index.test.ts`. You can add cases to it, or create a new `*.test.ts` file in the same folder —
vitest auto-discovers `*.test.ts` (no config file exists; defaults apply).

**Import path:** import the function under test with a relative path from `__tests__/` back into
`src/`. The existing file uses `from '../index'`:

```ts
import { describe, it, expect } from 'vitest'
import { createSlug, daysUntil, occasionEmoji } from '../index'
```

**Worked example** — mirror the existing style exactly. Suppose you add a `formatPrice` helper to
`packages/shared/src/index.ts`. Add to `packages/shared/src/__tests__/index.test.ts`:

```ts
import { formatPrice } from '../index'   // add to the existing import line

describe('formatPrice', () => {
  it('formats an integer ARS amount', () => {
    expect(formatPrice(66500, 'ARS')).toBe('$66.500')
  })

  it('returns a placeholder for null', () => {
    expect(formatPrice(null, 'ARS')).toBe('—')
  })
})
```

The existing tests show the three patterns to copy: exact-value assertions (`toBe('🎂')`), regex
shape assertions (`toMatch(/^mi-lista-de-cumple-/)`), and null/undefined handling (`toBeNull()`).
When a value depends on the clock (like `daysUntil`), the existing tests deliberately assert the
**format** (`/en \d+ día/`) rather than an exact day count, to stay stable across UTC offsets —
follow that pattern for any time-dependent helper.

**Run your new test:**

```bash
pnpm --filter shared test          # one-shot run; must show all green
```

The suite count must go UP (e.g. 13 → 15) and stay green. That new number is the new baseline for
gate 4.

---

## 5. Where automated coverage is MISSING and most needed (candidate work — not claims)

These are **open/candidate** gaps, not implemented tests. Do not describe them as covered. If asked
to "increase coverage", these are the highest-value targets, ranked. Each would require new test
infra (there is currently none for web/mobile/DB), so scope it and route any DB/config change
through `regala-change-control`.

| Priority | Untested surface | Why it matters | Candidate approach |
|---|---|---|---|
| P1 | **RLS policies** (claims/wishlists/items/profiles) | The real security boundary; a wrong policy = data leak or broken gifter view. Two past incidents were RLS (gifter 404; private leakage risk) | Integration tests hitting Supabase as anon vs owner, asserting row visibility. See `regala-diagnostics-and-verification` for the SQL primitives |
| P1 | **Claim race / `UNIQUE(item_id)`** | Correctness of the no-double-claim guarantee rests entirely on the DB constraint + `23505` handling — zero tests | Concurrent-INSERT test: fire two claims for one `item_id`, assert exactly one succeeds and the other maps to the friendly message |
| P1 | **Server actions** (`app/dashboard/actions.ts` etc.) | All mutations + ownership checks + LATAM price normalization live here, untested | Unit-test the Zod schemas / price transform in isolation; extract the price parser to `shared` so it becomes vitest-testable |
| P2 | **LATAM price parser** | Subtle es-AR thousands/decimal logic; regressed once (`66500`→`66.5`) | Move the normalizer into `packages/shared` and add vitest cases: `66.500`→66500, `1.234,56`→1234.56, `1,234.56`→1234.56, garbage→null |
| P2 | **Product extraction** (`api/extract-product`) | OG/JSON-LD parsing + SSRF guard + ML paths, all manual | Unit-test the pure extractors (title/price regex, `isPrivateHost`) with fixture HTML; see `regala-product-extraction` |
| P3 | **Web/mobile UI flows** | Entire critical path (§3) is manual | Playwright (web) / Detox (mobile) — large infra lift; only if the flows start regressing repeatedly |

The single cheapest high-value move is **extracting pure logic (price parsing, extraction regexes)
into `packages/shared`**, because that is the one place already wired for vitest — logic there gets
tests "for free".

---

## Provenance and maintenance

All facts verified 2026-07-12 against the repo at `/home/user/regala.me` and a live run of the
suite. Re-verify with:

| Fact | Re-verify command |
|---|---|
| Only `shared` has tests; count is 13 | `pnpm --filter shared test` → expect "Tests 13 passed (13)" |
| No root/web/mobile `test` script | `grep '"test"' package.json apps/web/package.json apps/mobile/package.json` (only `shared` matches) |
| Typecheck gates exist | `grep '"typecheck"' apps/web/package.json apps/mobile/package.json packages/shared/package.json` |
| No new advisor findings | Supabase MCP `get_advisors` (type `security` and `performance`); baseline is 3 WARN, 0 ERROR |
| Test file location/imports | `cat packages/shared/src/__tests__/index.test.ts` |

**CLAUDE.md staleness relevant here:** CLAUDE.md §3 still lists `wishlists.is_public` — that column
was removed and replaced by `privacy_level` (used in QA flow #9). Trust the verified fact, not
CLAUDE.md, but do not edit CLAUDE.md except through `regala-change-control`. The `avatars` bucket
(QA flow #11) is an unverified/open item — confirm before relying on avatar upload.
