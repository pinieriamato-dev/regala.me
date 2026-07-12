---
name: regala-diagnostics-and-verification
description: >
  Load this when you need to PROVE a claim about regala.me from first principles instead of
  eyeballing it — "did the migration actually apply?", "does RLS really block anon on private
  lists?", "can two gifters double-claim the same item?", "is the code green?", "is extraction
  broken or is MercadoLibre down?". Triggers: before saying "fixed"/"works"/"done"; verifying
  RLS or the UNIQUE(item_id) claim guard; SQLSTATE 23505; confirming pnpm typecheck/test status;
  checking Supabase advisors after a schema change; the scripts inspect-rls.sql,
  concurrent-claim-check.sql, verify-commands.sh, extraction-smoke.sh. Do NOT load this to DESIGN
  a fix or triage an unknown error (use regala-debugging-playbook) or to define the acceptance
  bar for shipping a feature (use regala-validation-and-qa).
---

# regala.me — Diagnostics & Verification

**What this is for:** turning "it looks fixed" into "here is the measurement that proves it."
This skill gives you read-only diagnostic queries/commands and a set of "prove it, don't eyeball
it" recipes. **Read this before you claim anything is fixed, safe, or green.** Audience: a
mid-level engineer or a Sonnet-class model with zero prior context on this repo.

Jargon defined once:
- **RLS** = Row-Level Security, Postgres per-row access rules. In regala.me RLS is *the* security
  boundary — the web app talks to Supabase server-side with a publishable key, so a wrong RLS
  policy leaks or hides data regardless of app code.
- **advisor** = Supabase's built-in linter (`get_advisors`) that flags security/performance issues.
- **SQLSTATE 23505** = Postgres `unique_violation` error code. It is the signal that the
  one-claim-per-item guard fired.
- **change-control** = the approval process for anything that writes to the DB or changes schema.
  Owned by the `regala-change-control` skill. This skill never routes around it.

## The four things you may NOT verify your way around

These are non-negotiable. A diagnostic that "proves" one of these is wrong means your test is
wrong, not the system:
1. **Zero-friction claims.** `claims."Anyone can claim"` (INSERT, roles `{public}`, WITH CHECK
   `true`) is INTENTIONAL. The advisor warning `rls_policy_always_true` on it is KNOWN/ACCEPTED —
   never "fix" it.
2. **Schema changes only via Supabase MCP migrations**, documented in CLAUDE.md §3 in the same
   change. No ad-hoc DDL.
3. **Never write `.env`/secrets to the repo.**
4. **Web design-system purity** (brutalist; not this skill's concern but still binding).

## The scripts (in `scripts/` next to this file)

| Script | Writes to DB? | Proves | Run it |
|---|---|---|---|
| `inspect-rls.sql` | No (all SELECT) | policies, constraints, and current row state as the DB actually has them | Supabase MCP `execute_sql` (project `esyybmnwalscpnzfeowh`), one statement per call; or psql |
| `verify-commands.sh` | No | code is green: 13 shared tests + 3 typechecks | `bash scripts/verify-commands.sh` from anywhere (it cd's to the monorepo root) |
| `extraction-smoke.sh` | No | the upstream MercadoLibre API shape the extraction route depends on | `bash scripts/extraction-smoke.sh [ML_ITEM_ID]` |
| `concurrent-claim-check.sql` | **YES — change-control gated** | the `UNIQUE(item_id)` double-claim guard raises 23505 | ONLY on a throwaway item, with approval (see the WARNING block in the file) |

## Prove-it recipes (don't eyeball it)

### Recipe A — Prove RLS holds (esp. that anon cannot read a `private` list)
**Why:** the gifter route (`app/[username]/[slug]/page.tsx`) queries Supabase with no user (anon
path). If the owner can see a list but anon cannot, that's correct; if anon can read a `private`
list, that's a leak. RLS is the only thing enforcing it.

Steps:
1. Run `inspect-rls.sql` statement 1. Confirm each of `wishlists`, `items`, `claims`, `profiles`
   has BOTH an owner policy and a public-read/insert policy. Expected shape (verified 2026-07-12):
   - `wishlists`: `Owners manage wishlists` (ALL, `owner_id = auth.uid()`) + `Public wishlists
     readable` (SELECT, `privacy_level IN ('public','link_only') OR owner_id = auth.uid()`).
   - `claims`: `Anyone can claim` (INSERT, `{public}`, `with_check = true`) + `Claims readable on
     public lists`.
   - `profiles`: `Users manage own profile` + `Profiles are publicly readable` (SELECT, USING
     `true`). That public-read policy is REQUIRED — without it the anon `profiles!inner` join in
     the gifter route returns nothing and every public list 404s (this actually happened; fixed by
     migration `profiles_public_read` / commit 0fab824).
2. Run statement 4 to confirm `relrowsecurity = true` on all four tables.
3. To prove anon truly cannot read a `private` list, query it the way anon would — the gifter
   route filters `.in('privacy_level', ['public','link_only'])`. A `private` row is excluded by
   that filter AND by the RLS `USING` clause, so anon gets `null` → `notFound()`. You can confirm
   the data with `inspect-rls.sql` statement 3 (lists `id, slug, privacy_level, owner_id`): any row
   with `privacy_level='private'` must NOT be reachable at `/{username}/{slug}` for a logged-out
   viewer. (Note: `link_only` is readable at the RLS layer exactly like `public` today — the only
   intended difference, a directory listing, isn't built yet. CLAUDE.md §3 still says `is_public
   BOOL` — that column DOES NOT EXIST; CLAUDE.md §3 is stale here.)

**Worked example (from repo history):** the "gifter page 404 for a valid public list" incident.
Symptom: a `privacy_level='public'` list 404'd for logged-out visitors. Recipe-A step 1 would have
shown `profiles` had ONLY `auth.uid() = id` and no public-read policy → the `profiles!inner` join
returned nothing for anon. Fix was the `profiles_public_read` migration. The measurement (dump
`pg_policies`, look for a public SELECT on `profiles`) is what distinguishes "app bug" from "RLS
gap".

### Recipe B — Prove no double-claim is possible
**Why:** the gifter view does NOT live-update today (only the acting browser updates via optimistic
`onClaimed` state). Two gifters can both TRY the same item. The ONLY thing preventing a real
double-claim is `UNIQUE(item_id)` on `claims` + the app mapping 23505 to a friendly error.

Cheap proof (no DB write): run `inspect-rls.sql` statement 2 and confirm the constraint exists:
`UNIQUE (item_id)` named `claims_item_id_unique`. If it's there, the guard is in place. Also read
the handler in `apps/web/app/[username]/[slug]/actions.ts`:
```
  if (error) {
    if (error.code === '23505') return { error: '¡Ya alguien lo reclamó! Elegí otro regalo.' }
```
That line is the app half of the guard — it turns 23505 into UX.

Strong proof (writes to DB → change-control only): run `concurrent-claim-check.sql` against a
throwaway item. Expected: first INSERT `INSERT 0 1`; second INSERT raises `23505` on
`claims_item_id_unique`; then the cleanup DELETE restores state. **PASS = exactly one succeeds.**
Never weaken this constraint to `(item_id, claimer_name)` — the SHIPPED guard is `UNIQUE(item_id)`,
one claim per item (TODOS.md described it as `(item_id, claimer_name)`; the DB disagrees — the DB
wins).

### Recipe C — Prove a migration actually applied (and didn't regress security)
**Why:** "I ran apply_migration" is not proof it took. And a schema change can silently introduce an
ERROR-level advisor.
1. List applied migrations via Supabase MCP `list_migrations` (project `esyybmnwalscpnzfeowh`).
   Verified-applied set as of 2026-07-12:

   | version | name |
   |---|---|
   | 20260518183402 | initial_schema |
   | 20260531054629 | add_privacy_level_replace_is_public |
   | 20260608213545 | add_unique_claim_per_item |
   | 20260609154127 | profiles_public_read |

   Your new migration's version+name must appear at the tail.
2. Confirm the change is really in the catalog with `inspect-rls.sql` (a new policy shows in
   statement 1; a new constraint in statement 2).
3. Run `get_advisors type=security` AND `type=performance`. Baseline (2026-07-12): **3 WARN, 0
   ERROR** — the 3 WARN are known/accepted (`rls_policy_always_true` on claims INSERT; the two
   `*_security_definer_function_executable` on the `handle_new_user` signup trigger). Any NEW WARN,
   or ANY ERROR, or a table appearing without RLS, is a regression — stop and escalate to
   `regala-change-control`.

**Worked example:** `add_unique_claim_per_item` (version 20260608213545). Proof it applied =
`list_migrations` shows the row AND `inspect-rls.sql` statement 2 shows `claims_item_id_unique
UNIQUE (item_id)`. Both together, not just the migration call returning success.

### Recipe D — Prove the code is green (tests + typecheck)
**Why:** typecheck is the cheapest, most deterministic gate in the repo, and `shared` has the only
automated test suite (13 tests). "Looks right" is not green.

Run `bash scripts/verify-commands.sh`. Expected output (verified 2026-07-12):
- `pnpm --filter shared test` → **13 tests pass**, 1 file (vitest run). The suite covers
  `createSlug`, `occasionEmoji`, `daysUntil` in `packages/shared/src/__tests__/index.test.ts`.
- `pnpm --filter shared typecheck`, `--filter web typecheck`, `--filter mobile typecheck` → all
  clean (`tsc --noEmit`, no output = pass).

Notes: a fresh container has no `node_modules`, so the script runs `pnpm install` first — skip it
and every command fails with "cannot find module". There is **no root `test` script**; don't run
`pnpm test` at the root expecting the suite. To gate one workspace fast, run just its line, e.g.
`pnpm --filter web typecheck`.

**Worked example:** the "image_url never saved" bug (commits 96df9e0/445c703). The lesson recorded
in the dossier is that adding a column requires touching form + Zod + insert + type — a
`pnpm --filter web typecheck` catches the type half instantly, which is why Recipe D runs before any
"done".

### Recipe E — Prove extraction is broken in OUR code vs. upstream MercadoLibre
**Why:** `/api/extract-product` degrades in known ways (Vercel IPs geo-blocked by ML catalog pages;
catalog `/p/` needs ML OAuth creds; bot-blocked pages yield only a site name). Before blaming the
route, check the data source.
1. You cannot curl our own endpoint blind — it requires an authed session cookie and returns 401
   "No autorizado" otherwise (auth guard added to close an SSRF open-proxy, commit 67e5a57).
2. Test the upstream directly: `bash scripts/extraction-smoke.sh MLA<digits>`. This calls
   `https://api.mercadolibre.com/items/<normalizedId>` — the exact URL `fetchMercadoLibreItem`
   uses (route.ts ~line 148). Interpretation:
   - HTTP 200 + JSON with `title`/`price`/`pictures` → upstream is healthy. If our route still
     returns nothing, the bug is our parsing/auth, not ML.
   - HTTP 401/403 → ML is blocking this IP (the known geo-block/degradation path). Not our bug.
   - HTTP 404 → dead id; pass a live one.

## When NOT to use this / use instead

| You want to… | Use instead |
|---|---|
| Triage an unknown error / form a hypothesis about a bug | `regala-debugging-playbook` |
| Read the full catalog of past incidents & their fixes | `regala-failure-archaeology` |
| Define the acceptance bar for shipping a feature / a QA pass | `regala-validation-and-qa` |
| Actually change schema, apply a migration, or run a DB-writing script | `regala-change-control` |
| Design & ship real-time claim coordination end-to-end | `regala-realtime-claims-campaign` |

This skill is the *measurement layer* those skills call into — it proves, it does not decide or fix.

## Provenance and maintenance

All facts verified 2026-07-12 against the repo at `/home/user/regala.me` and live Supabase project
`esyybmnwalscpnzfeowh`. Re-verification one-liners (run when a fact might have drifted):

- Migrations applied: Supabase MCP `list_migrations` (project `esyybmnwalscpnzfeowh`).
- Advisors baseline (expect 3 WARN / 0 ERROR): Supabase MCP `get_advisors type=security` and
  `type=performance`.
- RLS policies / constraints / rows: run `scripts/inspect-rls.sql`.
- Test count (expect 13) & typechecks green: `bash scripts/verify-commands.sh`.
- Claim handler / 23505 mapping: `sed -n '31,42p' apps/web/app/[username]/[slug]/actions.ts`.
- Extraction upstream URL: `grep -n 'api.mercadolibre.com/items' apps/web/app/api/extract-product/route.ts`.

CLAUDE.md staleness noted inline (is_public removed; profiles has bio/birthday; claims guard is
`UNIQUE(item_id)`). Do NOT edit CLAUDE.md except through `regala-change-control`.
