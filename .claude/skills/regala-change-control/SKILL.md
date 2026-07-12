---
name: regala-change-control
description: >
  Read this BEFORE proposing, gating, or merging ANY change to regala.me — it decides what review
  a change needs and encodes the four project non-negotiables with the real incident behind each.
  Load it when you are about to: change the DB schema or an RLS policy, touch env vars / feature
  flags / secrets, add or bump a dependency, edit `apps/web/app/globals.css` or `rg-*` design
  classes, weaken the `claims` INSERT policy or `UNIQUE(item_id)`, or open a PR and need the
  pre-merge checklist. Also load it whenever someone says "fix the rls_policy_always_true warning",
  "add a column", "add auth to claims", "just add a migration file", "make the buttons rounded",
  or "update CLAUDE.md". Do NOT load it for pure product/UX brainstorming, for writing app logic
  that adds no column/policy/dep (that's regala-architecture-contract), or for how to run tests
  (that's regala-validation-and-qa) — though this skill tells you WHICH gate those must pass.
---

# regala-change-control

**What this is for:** the rules of the road for changing regala.me safely. It tells you how to
classify a change, which gate it must clear, the four non-negotiable rules (with the historical
outage that motivates each), and the exact touch-lists for schema and column changes. Read it before
you write code that changes behavior, data shape, config, or design. Audience: a mid-level engineer
or a Sonnet-class model with zero prior context.

**Jargon, defined once:**
- **RLS** = Row-Level Security: Postgres policies that decide, per row, who may SELECT/INSERT/UPDATE.
  Supabase enforces them; they are the app's real security boundary.
- **Gate** = the minimum review/verification a change must pass before merge.
- **Change-control** = this document's process. "Route around change-control" = ship a change in a
  class without doing its gate (e.g. an ad-hoc `ALTER TABLE`, or committing a `.env`).
- **Advisor** = Supabase's `get_advisors` linter (`type=security|performance`).
- **Non-negotiable** = a rule that is never traded away for convenience. There are four.

---

## When NOT to use this / use instead

| You want to… | Use instead |
|---|---|
| Understand server-action / RLS / client architecture in depth | **regala-architecture-contract** |
| Know which env var does what, or create `.env` files | **regala-config-and-env** |
| Actually run typecheck / tests / manual QA (the how) | **regala-validation-and-qa** |
| Update CLAUDE.md, TODOS.md, or write copy correctly | **regala-docs-and-writing** |
| Reproduce a bug, query the live DB, read advisors | **regala-diagnostics-and-verification** |

This skill owns *classification, gates, and the non-negotiables*. It cross-references the others for
the how-to; it does not duplicate them.

---

## 1. Change-classification table

Find the row that best fits your change. If a change spans rows, it takes the **strictest** gate of
all rows it touches. Every class also inherits the baseline gate: **typecheck the affected app(s)
and commit no secrets** (see §4).

| Class | Examples | Required gate |
|---|---|---|
| **Trivial copy / style** | Fix a typo, change a Spanish string, tweak spacing within the existing `rg-*` system | Typecheck affected app. Confirm copy voice (voseo, no "gratis para siempre", no Google Sheets / WhatsApp as PRIMARY CTA — see regala-docs-and-writing). No new class introduced. |
| **App logic** | New/changed server action, component, extraction rule, route — no column, policy, dep, or design token added | Typecheck **all** filters (web + shared + mobile as touched). Keep every server-action invariant: `getUser()` guard → ownership re-check → Zod parse → write → `revalidatePath()` (§2.1, regala-architecture-contract). Manual critical-path run of the touched flow. `pnpm --filter shared test` if shared changed. |
| **Schema / RLS** | Add/drop/alter a column; add/change a policy, constraint, trigger, index | Full **schema-change protocol** (§3). Never ad-hoc SQL against the live DB. |
| **Config / env / flag** | New env var, change a default, gate a feature on `HCAPTCHA_SITE_KEY`/`ML_CLIENT_*`, enable Supabase Realtime replication | Document the var in regala-config-and-env's table AND CLAUDE.md §4 via docs change. Never commit the value (§4). Confirm required-vs-optional and the code-side default. Realtime replication is a **schema/config change** → also §3. |
| **Design-system** | Edit `apps/web/app/globals.css`, add/alter an `rg-*` class or CSS var, add a new UI surface | Design-purity check (§2.4 + §5 checklist): no blur, no radius > 4px (`--radius: 4px`), Archivo Black display, hard offset shadows, `rg-*` classes not stray Tailwind. Do not imitate `dashboard/new/page.tsx` (known violator). |
| **Dependency** | Add or bump a package in any workspace | Justify the add (is it already solvable with `shared` or std lib?). Typecheck all filters + `pnpm --filter shared test`. Check it doesn't break `transpilePackages:['shared']` (web) or Expo new-arch (mobile). Pin to the workspace's existing version style (`^`). Never add a client-side Supabase key or a package that moves Supabase calls to the browser (violates the server-only architecture, commit `c097e16`). |

---

## 2. The four non-negotiables (rule → rationale → incident)

These are user-confirmed and load-bearing (verified 2026-07-12). Never trade any of them for
convenience, and never let a change quietly weaken one.

### 2.1 Zero-friction claims — gifters never sign up to claim

- **Rule:** A gifter claims an item with only `claimer_name` (text). No account, no auth, ever. The
  RLS policy on `claims` — `"Anyone can claim"` (INSERT, roles `{public}`, `WITH CHECK (true)`) — is
  **intentional**. Supabase's advisor flags it as `rls_policy_always_true` (WARN). That warning is
  **known and accepted**. Do not "fix" it by adding auth or a tighter `WITH CHECK`.
- **Rationale:** The product's entire viral loop is the no-account claim. Friction here kills the
  gifter→creator conversion that is the whole business bet ("Tu lista de regalos, sin dramas").
- **Incident / evidence:** The `claims` `WITH CHECK (true)` policy is the deliberate design; the
  advisor WARN is one of three accepted security warnings (the other two are on the
  `handle_new_user` signup trigger). Correctness against double-claims is protected at the DB layer
  by `UNIQUE(item_id)` + Postgres error `23505` handling — NOT by auth. If you think you need auth to
  stop abuse, you are about to break the non-negotiable; solve it another way and escalate.
- **Fence:** Don't add auth to claims. Don't weaken or drop `UNIQUE(item_id)`. Don't move the claim
  INSERT client-direct, bypassing the `claimItem` server action.

### 2.2 Schema changes only via Supabase MCP migrations

- **Rule:** All schema changes go through `apply_migration` (Supabase MCP). **No migration `.sql`
  files live in the repo** — the DB's applied-migrations list is the source of truth. Every schema
  change is documented in CLAUDE.md §3 **in the same change**. Never `ALTER` the live DB ad-hoc; never
  let CLAUDE.md drift from the DB.
- **Rationale:** There is one shared Supabase project for web + mobile. Undocumented drift between
  the DB and CLAUDE.md is exactly what caused the worst outage this project has had.
- **Incident:** **Every wishlist insert was rejected** — the code inserted a non-existent `is_public`
  column after the schema had moved to `privacy_level` (migration `add_privacy_level_replace_is_public`).
  Fixed by removing `is_public` from the web action and mobile create-list and using `privacy_level`
  (commits `9f523d0`, `67e5a57`). **Lesson, still true today:** CLAUDE.md §3 STILL lists
  `is_public BOOL default true` — that is stale/wrong; `is_public` does not exist. Trust the DB.
  *(CLAUDE.md §3 is stale here — surface the verified fact, but only fix CLAUDE.md through the docs
  change-control path, not by editing it out of band.)*
- **Fence:** Don't hand-write a `migrations/*.sql` file "to be tidy" — that contradicts the model and
  will diverge from what's actually applied. Apply via MCP and record it in CLAUDE.md §3.

### 2.3 Never commit .env / secrets

- **Rule:** `.env`, `.env.local`, `apps/web/.env*`, `apps/mobile/.env*` are git-ignored AND the tool
  sandbox blocks writing them. Real secrets (Supabase publishable key, `ML_CLIENT_ID`/`ML_CLIENT_SECRET`,
  `HCAPTCHA_*`) never land in the repo. Users create env files by hand with `printf`.
- **Rationale:** A leaked key in git history is permanent and costly. The architecture deliberately
  keeps all Supabase access server-side (commit `c097e16`, "move all Supabase calls server-side, drop
  NEXT_PUBLIC_ keys") so no key is shipped to the browser — RLS is the boundary, not secrecy of a
  browser key.
- **Incident / evidence:** `.gitignore` lines 15-20 hard-block every `.env*` path; commit `c097e16`
  removed the `NEXT_PUBLIC_` Supabase keys entirely. There is no `NEXT_PUBLIC_` Supabase key on web on
  purpose — do not reintroduce one.
- **Fence:** Don't add a secret to `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` unless it is genuinely public.
  Don't paste a key into a committed file, a test, or a comment. If a `.env` is missing, tell the user
  to create it by hand (see regala-config-and-env) — do not try to write it yourself.

### 2.4 Design-system purity (web)

- **Rule:** The web app is brutalist/neubrutalist: **NO blur**, **NO rounded corners beyond 4px**
  (`--radius: 4px`), Archivo Black display type, **hard offset shadows** (`5px 5px 0 0 #0F0F0F`,
  no blur radius), yellow highlights. Use the `rg-*` classes and CSS vars from
  `apps/web/app/globals.css`, not stray Tailwind defaults.
- **Rationale:** The look is a deliberate ugly.cash-inspired brand differentiator. Drift toward
  generic Tailwind erodes it surface by surface.
- **Incident:** `apps/web/app/dashboard/new/page.tsx` was built with raw Tailwind classes instead of
  the `rg-*` system — it is documented gap #4 (CLAUDE.md §12) and is a **known violator**. It renders,
  so it's not urgent, but **do not imitate it**. New surfaces use `rg-*`.
- **Fence:** Don't introduce `blur`, `rounded-lg`/`rounded-xl`, soft drop-shadows, or a non-Archivo
  display font on web. If a design needs a new token, add it to `:root` in `globals.css` (a
  design-system-class change, §1).

> The mobile app uses a **different, pre-brutalist palette** (`constants/colors.ts`, coral `#E85D4A`)
> and is intentionally NOT yet migrated (gap #2). Design-purity §2.4 is a **web** rule; don't "fix"
> mobile colors to match web without an explicit decision.

---

## 3. Schema-change protocol (the only way to change the DB)

Follow every step, in order. This is the gate for the **Schema / RLS** class.

1. **Inspect first.** `list_tables` and `execute_sql` (SELECT only) to confirm the current shape.
   Read the current RLS with `select * from pg_policies where schemaname='public';` and constraints
   with `select conname, pg_get_constraintdef(oid) …`. (Details: regala-diagnostics-and-verification.)
2. **Apply via MCP.** Use `mcp__…__apply_migration` with a clear `name` (snake_case, e.g.
   `add_privacy_level_replace_is_public`). Never run a raw `ALTER` outside `apply_migration`; never
   create a `migrations/*.sql` file in the repo.
3. **Document in CLAUDE.md §3 in the SAME change.** Update the schema block and the applied-migrations
   table so docs match the DB. (Do this through the docs path — regala-docs-and-writing.)
4. **Re-run advisors.** `get_advisors type=security` and `type=performance`. Compare against the known
   accepted baseline (verified 2026-07-12): exactly **3 security WARNs** —
   `rls_policy_always_true` on `claims` INSERT, and `anon_`/`authenticated_security_definer_function_executable`
   on `handle_new_user`. **Any NEW warning, or any ERROR-level advisor, is a blocker** — resolve or get
   explicit sign-off before merge. No table may be left without RLS.
5. **Typecheck.** Run `pnpm --filter web typecheck` (and `shared`/`mobile` if their types touch the
   changed shape). If you added a column that the app reads/writes, also do the column touch-list (§6).
6. **Manual critical-path.** Exercise the flow the change affects (create list, add item, claim) —
   see regala-validation-and-qa.

**Realtime note:** enabling Supabase Realtime replication on a table (e.g. `claims`, for the flagship
real-time-claim work) is a schema/config change — run this whole protocol, and it does NOT permit
weakening §2.1 or `UNIQUE(item_id)`.

---

## 4. Pre-merge gate checklist (run before any PR / merge)

Tick every box that applies. A change merges only when its class's gate (from §1) AND every applicable
box below are green.

- [ ] **Typecheck the affected filters** — `pnpm --filter web typecheck`, `pnpm --filter shared typecheck`,
      `pnpm --filter mobile typecheck` (whichever the change touches). All ran clean 2026-07-12.
- [ ] **Shared test** — `pnpm --filter shared test` (13 tests, the ONLY automated suite; run it if
      `packages/shared` changed or a dep bump could affect it). There is **no root `test` script**.
- [ ] **Manual critical-path** — actually drive the touched flow (create list → add item → open gifter
      URL → claim). See regala-validation-and-qa. Requires `pnpm install` first in a fresh container.
- [ ] **No secrets** — `git diff` contains no key, no `.env*` file, no new `NEXT_PUBLIC_`/`EXPO_PUBLIC_`
      Supabase key (§2.3).
- [ ] **Design purity** (web UI changes) — no blur, no radius > 4px, Archivo Black display, hard
      shadows, `rg-*` classes (§2.4). Didn't copy `dashboard/new/page.tsx`.
- [ ] **Server-action invariants** (if you touched an action) — `getUser()` guard, ownership re-check
      (`.eq('owner_id', user.id)`), Zod `safeParse`, `revalidatePath()` after the write. All nine
      actions in `apps/web/app/dashboard/actions.ts` follow this — match it. Two legitimate exceptions
      to the `.eq('owner_id', user.id)` re-check: `createWishlist` inserts a brand-new row (no prior
      owner to re-check) and `updateProfile` is scoped by the caller's own profile id (`id = user.id`),
      not `owner_id`.
- [ ] **Schema class** — the §3 protocol was fully run and advisors show no new/ERROR findings.
- [ ] **Non-negotiables** — none of §2.1–§2.4 were weakened.

---

## 5. "Adding a DB column" touch-list

A column is not "added" until every consumer knows about it. This list is drawn directly from the
**`image_url` incident**: the column existed in the schema and the UI, but was **missing from the
`addItem` `safeParse` object**, so it was silently never saved (fixed in `96df9e0` / `445c703`).
Miss one of these and you get a bug that typechecks clean.

For a new column `foo` on table `T`, touch **all** of:

| # | Touch | Where | Note |
|---|---|---|---|
| 1 | **Migration** | via `apply_migration` (§3) | the column itself + any default/constraint |
| 2 | **CLAUDE.md §3** | docs, same change | keep the schema block truthful |
| 3 | **Shared type** | `packages/shared/src/types.ts` | add `foo` to the `T` row type |
| 4 | **Zod schema** | e.g. `addItemSchema` / `createWishlistSchema` in `app/dashboard/actions.ts` | parse + normalize `foo`; remember Zod v4 optional-field trap (§ below) |
| 5 | **Form field** | the relevant form component (e.g. `add-item-form.tsx`) | render an input named `foo` |
| 6 | **Insert / select** | the server action's `.insert({…})` / `.update({…})` AND the read query's `.select(...)` | the `image_url` bug was exactly a missing insert key |

**Zod v4 trap (real, recurring):** `formData.get('foo')` returns `null` for an absent field, and Zod
v4 `.optional()` is `union(T, undefined)` — `null` **fails** with "Invalid input". Pass `?? undefined`
when reading optional fields (commit `67c3fbe`). Note the two forms in `actions.ts`: `createWishlist`
uses `formData.get('x') ?? undefined`, while `addItem` relies on the schema's `.optional().transform`
— match the pattern of the form you're editing.

**Priority default caveat:** if your column has a DB default, verify the app default matches. Today
`items.priority` is a live three-way inconsistency — DB default **2**, web `addItemSchema` default **1**
(`priority: z.coerce.number().int().min(1).max(3).default(1)`), mobile default **2**. Don't add a
fourth interpretation; if you touch priority, reconcile it deliberately.

---

## Provenance and maintenance

All facts verified **2026-07-12** against the repo and the live Supabase project
`esyybmnwalscpnzfeowh`. Volatile facts and how to re-verify:

| Fact | Re-verify with |
|---|---|
| Applied migrations / no repo `.sql` files | Supabase MCP `list_migrations`; `git ls-files '**/migrations/**'` (should be empty) |
| Accepted advisor baseline (3 WARN, 0 ERROR) | `get_advisors type=security` then `type=performance` |
| `claims` policy `WITH CHECK (true)` + `UNIQUE(item_id)` | `select * from pg_policies where tablename='claims';` and `select conname,pg_get_constraintdef(oid) from pg_constraint where conrelid='public.claims'::regclass;` |
| `.env*` git-ignored, no committed secrets | Read `.gitignore` (lines 15-20); `git grep -i 'PUBLISHABLE_KEY\|CLIENT_SECRET' -- ':!*.md'` |
| Server-action invariants | Read `apps/web/app/dashboard/actions.ts` (each action: `getUser()` → ownership `.eq('owner_id', user.id)` → `safeParse` → `revalidatePath`) |
| Typecheck / test gates pass | `pnpm install` then `pnpm --filter web typecheck && pnpm --filter shared test` |
| Incident commits exist | `git show --stat 9f523d0 67e5a57 0fab824 4a5a675 67c3fbe 96df9e0 445c703 c097e16` |
| Design tokens (`--radius:4px`, hard shadows) | Read `:root` in `apps/web/app/globals.css` |

**Known CLAUDE.md drift to keep in mind (do NOT fix out of change-control):** §3 still lists
`is_public` (removed — use `privacy_level`) and omits `profiles.bio`/`birthday`; §4 omits
`HCAPTCHA_SITE_KEY`/`ML_CLIENT_ID`/`ML_CLIENT_SECRET`. Surface the verified fact; correct CLAUDE.md
only via the docs change-control path (regala-docs-and-writing).
