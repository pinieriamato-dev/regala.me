---
name: regala-realtime-claims-campaign
description: >-
  The executable, decision-gated campaign for regala.me's flagship hard problem: real-time claim
  coordination on the public gifter page. Load this when the task is "make claims update live", "two
  gifters can claim the same item", "add Supabase Realtime to the gifter view", "the stats bar is
  stale until reload", "wire a subscription in gifter-items.tsx", or any work touching
  apps/web/app/[username]/[slug]/{page.tsx,gifter-items.tsx,claim-button.tsx,actions.ts} for
  cross-client sync. It defines MEASURABLE success, a reproduce→choose→implement→validate→promote
  runbook with expected observations at every gate, a ranked solution menu with proof obligations,
  fenced-off wrong paths, and a change-control-gated promotion protocol. Do NOT load it for a
  one-off "why did this claim fail" bug (that is regala-debugging-playbook), for the general
  server-only/RLS architecture rationale (regala-architecture-contract), or for how to run the
  verification tools themselves (regala-diagnostics-and-verification).
---

This skill is the campaign plan for making claims coordinate in real time across gifters without
breaking the correctness guarantee that already exists. Read it end to end before writing any code.
Audience: a zero-context mid-level engineer or a Sonnet-class model who will carry this project
forward. It is executable: numbered phases, exact commands, and an "if you see X instead → branch to
Y" at every gate. Success is **measured, never eyeballed**.

Jargon defined once, on first use:
- **Gifter**: someone claiming a gift on a public list; never has an account (non-negotiable #1).
- **Claim**: a row in the `claims` table reserving one item. `claimer_name` (text) is the only
  required field.
- **RLS** (Row-Level Security): Postgres policies that decide which rows a role may read/write.
  In this app RLS — not app code — is the security boundary (see regala-architecture-contract).
- **Realtime**: Supabase's WebSocket service. `postgres_changes` streams INSERT/UPDATE/DELETE from
  the DB write-ahead log to subscribed browsers; `broadcast` relays arbitrary client-sent messages.
- **Optimistic local state**: a client updating its own UI immediately, before/without hearing back
  from other clients. This is the CURRENT mechanism — and it is NOT cross-client sync.
- **23505**: the Postgres SQLSTATE for a unique-constraint violation.

---

## The problem and the current mechanism (verified 2026-07-12)

The gifter page renders fresh on every load but does **not** live-update. When gifter A claims an
item, only A's browser reflects it. Gifter B keeps seeing the item as available until B reloads.

Exact current pipeline (quoting the real files):

1. `apps/web/app/[username]/[slug]/page.tsx` — server component, `export const revalidate = 0` (line
   9). `getListData` computes claimed state **once, at request time**: it selects `claims` by
   `item_id` (lines 34-35), builds `claimedIds`, and passes them to the client component (lines
   127-133). There is no subscription.
2. `gifter-items.tsx` — `'use client'`. It seeds `localClaimed` from the server's `claimedIds`
   (`useState<Set<string>>(() => new Set(claimedIds))`, line 17) and exposes `handleClaimed` (lines
   19-21) which adds an id to `localClaimed`. The stats bar comment says "updates in real time"
   (line 36) but it only updates for **this** browser.
3. `claim-button.tsx` — on a successful claim it fires `onClaimed?.(itemId)` in a `useEffect`
   (lines 16-18). That is the entire "real-time-ish" behaviour: optimistic local state, one client.
4. `actions.ts` — `claimItem` re-checks the item's wishlist is `public`/`link_only`, inserts the
   claim, and maps the unique-violation to a friendly Spanish string:
   `if (error.code === '23505') return { error: '¡Ya alguien lo reclamó! Elegí otro regalo.' }`
   (line 37).

**The sole real-double-claim guard is the database.** `claims` has
`claims_item_id_unique = UNIQUE (item_id)` (verified 2026-07-12 via `pg_constraint`). One claim per
item, period — not `(item_id, claimer_name)`. So correctness is already safe: two gifters can both
*try*, but exactly one INSERT wins and the loser gets 23505. The gap is purely **UX**: B's view is
stale, and the losing gifter only learns at submit time.

> CLAUDE.md §12 gap #3 ("No real-time claim updates") and TODOS.md P3 name Supabase Realtime as the
> intended fix. This skill turns that into a gated, measurable campaign.

---

## MEASURABLE success criteria (targets are CANDIDATES — ratify before building)

Do not start Phase 2 until a human/owner ratifies the numeric targets via regala-change-control.

| # | Criterion | How measured | Candidate target |
|---|-----------|--------------|------------------|
| S1 | Zero real double-claims, ever | Concurrent-claim experiment (Phase 0/3): count `claims` rows for one `item_id` after N simultaneous attempts | Exactly 1 row, always. Already held by `UNIQUE(item_id)` — must STAY true. |
| S2 | A second gifter sees an item become unavailable **without reload** | Two live browser sessions; timestamp claim-commit → other session's UI flips to "reclamado" | Convergence p95 ≤ 2s (Realtime typically < 1s) |
| S3 | The losing gifter is told clearly | Inspect UX when their claim loses the race | Either (a) button/item is already disabled when they open it (via S2), or (b) they still get the 23505 message at submit. S2 makes (a) the common case; (b) is the guaranteed floor. |

S1 is an invariant, not a feature — it must never regress. S2 is the actual new capability. S3 is a
consequence of S2 plus the existing 23505 handling; the 23505 path is the correctness floor and must
remain even after S2 ships.

---

## Phase 0 — Reproduce the race (do this FIRST; it is your baseline measurement)

You cannot claim to have fixed staleness until you have measured it existing. Two ways:

**0a. DB-level proof that UNIQUE holds (fast, no browser).** This writes to the live DB, so it is
**gated by change-control** and MUST use a **purpose-created THROWAWAY item** — never an item selected
from a real user's wishlist. Do NOT pick a "real unclaimed item"; that would mark a genuine user's gift
as reclamado. Preconditions: (1) change-control approval to write to project `esyybmnwalscpnzfeowh`
(or use a branch DB); (2) you have created a throwaway wishlist+item and captured its id; (3) you run
the cleanup DELETE afterwards.

**Do not hand-roll this — run the audited script instead:** regala-diagnostics-and-verification ships
`scripts/concurrent-claim-check.sql`, which already encodes the throwaway-item requirement, the two
INSERTs, and the mandatory cleanup. Fire two INSERTs for the same throwaway `item_id`:

```sql
-- <ITEM_ID> = a throwaway item you just created (NOT a real user's item):
insert into claims (item_id, claimer_name) values ('<ITEM_ID>','A');
insert into claims (item_id, claimer_name) values ('<ITEM_ID>','B');  -- expect 23505
-- cleanup (leave the DB as you found it):
delete from claims where item_id = '<ITEM_ID>' and claimer_name in ('A','B');
```
Run via Supabase MCP `execute_sql` (project `esyybmnwalscpnzfeowh`).
**EXPECTED:** first insert succeeds, second fails with SQLSTATE `23505`
(`duplicate key value violates unique constraint "claims_item_id_unique"`).
> Never point this at an item on a real user's wishlist, and never touch pre-existing claims.

- **If BOTH inserts succeed → STOP and branch.** The unique constraint is missing or was dropped.
  Verify: `select conname, pg_get_constraintdef(oid) from pg_constraint where
  conrelid='public.claims'::regclass and contype='u';` must return `UNIQUE (item_id)`. If it does
  not, the correctness guarantee is broken — that is a change-control incident, not a realtime task.
  Restoring it is gated by regala-change-control (schema change). Do not proceed with realtime.

**0b. Browser-level proof of staleness (the UX gap).** Open the public URL
`/{username}/{slug}` in two separate browser sessions (two windows / one incognito). In window 1,
claim an item. **EXPECTED:** window 1 flips the item to "✓ RECLAMADO" and its stats bar decrements;
window 2 shows **no change** until you reload it. That stale window is exactly what S2 must close.
Record the wall-clock gap — it is currently unbounded (until manual reload).

- **If window 2 DID update live without reload →** a subscription already exists; re-read
  `gifter-items.tsx` for a `.channel(` / `postgres_changes` call before doing anything. As of
  2026-07-12 there is none.

---

## Phase 1 — Solution menu, RANKED, each with its proof obligation

Pick ONE mechanism. Each row states what must be TRUE for it to work, its cost, its latency, and
what you must measure. Ranking is by fit to the three success criteria.

### Option A (recommended) — Supabase Realtime `postgres_changes` on `claims` INSERT
**Theory:** the DB streams every new `claims` row to subscribed browsers over a WebSocket; each
gifter's `GifterItems` receives the INSERT and adds `item_id` to `localClaimed`. Server-authoritative
(the event is the committed row), RLS-gated, sub-second.

**Proof obligations — ALL must be satisfied, and two of them are change-control gates:**
1. **Replication must be enabled on `claims`.** Verified 2026-07-12: the `supabase_realtime`
   publication currently contains **zero tables**, so `claims` emits nothing today. Enabling it is
   `alter publication supabase_realtime add table public.claims;` — a **schema/config change**.
   Per non-negotiable #2 it MUST go through `apply_migration` (Supabase MCP) and be documented in
   CLAUDE.md §3 in the same change. Route via regala-change-control. (You may also need
   `alter table public.claims replica identity full;` only if you require OLD-row data on
   UPDATE/DELETE — for INSERT-only claim events, default replica identity is enough.)
2. **Anon must pass RLS SELECT on the claim row.** Realtime respects RLS: an event is delivered only
   if the subscribing role could `SELECT` that row. The `claims` policy `Claims readable on public
   lists` already lets anon read claims whose item→wishlist is `public`/`link_only` (verified). So
   for the lists gifters actually see, this holds — no policy change needed. Confirm before trusting:
   `select policyname, cmd, roles from pg_policies where tablename='claims';`
3. **A browser Supabase client must exist.** Today there is NONE — all web Supabase access is
   server-side and there is deliberately **no `NEXT_PUBLIC_` Supabase key** (commit c097e16 moved
   everything server-side). Option A reverses that: you must expose a browser client (e.g.
   `createBrowserClient` from `@supabase/ssr`) which needs a browser-visible URL + publishable key
   (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). RLS remains the security
   boundary so the exposure risk is bounded, but this is an **architectural + env change** — clear it
   with regala-architecture-contract AND regala-change-control (new env var) before writing it.
   The subscription is anon and **read-only**; it must never be used to INSERT claims (see fences).

**Cost:** Realtime is included in the $10/mo Pro plan but has concurrent-connection and message
quotas — one WebSocket per open gifter tab. **Latency:** typically < 1s. **Measure:** S2 convergence
p95 across two sessions; peak concurrent connections during a launch; that S1 still holds (Phase 3).

### Option B — Periodic refetch / polling (cheapest, no schema/arch change)
**Theory:** the client re-pulls claim state on an interval and reconciles. Since there is no browser
DB client, poll a small server route (or call `router.refresh()`) every N seconds to re-run the
server component's claim query.
**Proof obligation:** none structural — works with today's server-only architecture and needs NO
migration and NO new env var. That is its big advantage.
**Cost:** N requests/tab/minute (server + DB load scales with viewers). **Latency:** = poll interval;
candidate 5-10s (misses S2's ≤2s unless you poll aggressively, which raises cost). **Measure:**
staleness window (= interval), request volume at expected concurrency. Good fallback / stopgap; does
not meet an aggressive S2 target cheaply.

### Option C — Realtime `broadcast` channel (augmentation only, NOT authoritative)
**Theory:** on a successful claim, the acting client broadcasts `{item_id}` on a per-list channel;
other clients listening mark it claimed. No DB replication needed.
**Proof obligation / why it is ranked last:** broadcast is best-effort and **not** tied to committed
DB state or RLS. A gifter who loads *after* the broadcast never hears it; a dropped message is lost;
a client could forge messages. It can make the UI feel instant but can NEVER be the correctness or
even the reliable-freshness mechanism. **Only** valid as a latency sweetener layered on top of A.
**Measure:** delivery rate, and confirm it never becomes the source of truth (S1 still enforced by
the DB, S2 still backed by A's authoritative events).

**Decision gate:** If the owner ratifies an aggressive freshness target (S2 ≤ 2s) and accepts the
schema+arch+env changes → **Option A**. If they want zero schema/arch change and tolerate a few
seconds of staleness → **Option B**. Use **C** only to polish A, never alone.

---

## Phase 2 — Implement the chosen path (this section assumes Option A)

Keep the entire existing correctness path intact: the `claimItem` **server action**, the
`UNIQUE(item_id)` constraint, and the `23505` mapping all STAY. You are ADDING a read-only listener,
not replacing anything.

1. Land the replication migration through regala-change-control first (Phase 1 obligation #1) and the
   `NEXT_PUBLIC_` env additions (obligation #3). Do not write UI that subscribes to a table that is
   not yet replicated — it will silently receive nothing.
2. In the `'use client'` `gifter-items.tsx`, add a `useEffect` that creates a browser Supabase client
   and subscribes to INSERTs on `claims`. On each event, call the SAME reconciler you already have —
   fold the new `item_id` into `localClaimed` (reuse the `setLocalClaimed(prev => new Set([...prev,
   id]))` shape from `handleClaimed`, lines 19-21). Deduplicate: adding an id already in the set is a
   no-op, so an event for this client's own claim is harmless. Clean up the channel on unmount.
   Sketch (adapt names to the real client helper you introduce):

   ```tsx
   useEffect(() => {
     const supabase = createBrowserSupabase() // new browser client; anon, read-only
     const channel = supabase
       .channel(`claims:${listId}`)
       .on('postgres_changes',
         { event: 'INSERT', schema: 'public', table: 'claims' },
         (payload) => {
           const id = (payload.new as { item_id: string }).item_id
           setLocalClaimed(prev => (prev.has(id) ? prev : new Set([...prev, id])))
         })
       .subscribe()
     return () => { supabase.removeChannel(channel) }
   }, [listId])
   ```
   Note: `postgres_changes` cannot server-side-filter by "items on THIS wishlist" in one clause
   (claims has no `wishlist_id`); either subscribe to all `claims` INSERTs and ignore ids not in your
   `items` prop, or filter by the item-id set client-side. RLS still limits delivered rows to lists
   anon may read, but a public claim on ANOTHER list could arrive — drop it if its id is not among
   this page's items.
3. Do NOT change `page.tsx`'s server-side initial computation — it stays the source of truth for the
   first paint; the subscription only keeps it fresh afterward.

---

## Phase 3 — Validate (MEASURED, in this order; every item must pass)

| Gate | Command / method | PASS condition |
|------|------------------|----------------|
| S1 concurrent-claim | Phase 0a experiment (or `concurrent-claim-check.sql`) after the change | Exactly one row per `item_id`; second attempt still 23505 |
| S2 convergence | Two live browser sessions; claim in one, time until the other flips without reload | p95 ≤ ratified target (candidate ≤ 2s) |
| S3 loser UX | Race two claims; observe the loser | Item already shown claimed (via S2) OR the 23505 message appears at submit |
| Typecheck | `pnpm --filter web typecheck` | clean (`tsc --noEmit`) |
| Advisors | Supabase MCP `get_advisors type=security` and `type=performance` | No NEW ERROR; the 3 known WARNs unchanged (see below) |
| RLS for anon | `select policyname,cmd,roles from pg_policies where tablename='claims';` and confirm anon can read only public/link_only claims | Unchanged; private-list claims still not anon-readable |
| Regression suite | `pnpm --filter shared test` | 13 tests pass (only automated suite) |

Known-accepted advisors that must remain unchanged (not regressions): `rls_policy_always_true` on the
`claims` INSERT policy (intentional, non-negotiable #1) and the two `*_security_definer_function`
warnings on `handle_new_user`. A NEW advisor after your change is a finding — investigate before
promoting. Depth on running these gates lives in regala-diagnostics-and-verification.

---

## FENCED-OFF wrong paths (do NOT do these — each breaks a non-negotiable)

- **Do NOT weaken or drop `UNIQUE(item_id)`** (`claims_item_id_unique`). It is the ONLY thing
  preventing a real double-claim. "Realtime will prevent races" is FALSE — subscriptions are
  eventually-consistent and racy; the DB constraint is the guarantee. Removing it is a correctness
  regression, not an optimization.
- **Do NOT move the claim INSERT client-direct**, bypassing the `claimItem` server action, "because
  we now have a browser client." The browser subscription is READ-ONLY. Writes stay in the server
  action (auth-context re-check of wishlist privacy + 23505 mapping live there). Client-direct writes
  lose that check and the friendly error path.
- **Do NOT require gifter auth** to claim or to subscribe. Non-negotiable #1: zero-friction claims,
  no account ever. The subscription runs as anon and is RLS-gated; that is by design.
- **Do NOT rely on optimistic local state (or broadcast) as the correctness mechanism.** Local
  `localClaimed` and any broadcast are UX niceties. Correctness = `UNIQUE(item_id)` + 23505. Freshness
  = authoritative `postgres_changes`. Never conflate the two.

---

## Promotion protocol — how this becomes "adopted"

A working branch is NOT an adopted feature. Route promotion through **regala-change-control**, which
owns the four non-negotiables and the pre-merge gate. It is adopted only when ALL are true:

1. The replication migration (`alter publication supabase_realtime add table public.claims;`) was
   applied via Supabase MCP `apply_migration` and **documented in CLAUDE.md §3** in the same change
   (non-negotiable #2 — no ad-hoc schema, no CLAUDE.md drift).
2. Any new `NEXT_PUBLIC_` env var is documented (its default-in-code and consuming file) — that is
   regala-config-and-env's catalog — and cleared as an architecture change with
   regala-architecture-contract (introducing a browser Supabase client reverses commit c097e16).
3. All Phase 3 gates are green: S1/S2/S3 measured and met, `pnpm --filter web typecheck` clean,
   `pnpm --filter shared test` 13/13, advisors show no new ERROR and the 3 known WARNs unchanged.
4. No new secret in the repo (non-negotiable #3); the design system is untouched or still brutalist-
   pure (non-negotiable #4) — this feature is behavioural, so it should touch neither.

Until every box is checked, describe the work as **candidate**, not done.

---

## When NOT to use this / use instead

- A single claim failing, or "¡Ya alguien lo reclamó!" appearing when you did not expect it → that is
  triage: **regala-debugging-playbook** (the 23505 path is a documented, correct behaviour there).
- WHY the web client is server-only, WHY RLS is the boundary, WHY `UNIQUE(item_id)` exists → the
  rationale map is **regala-architecture-contract**. Read it before Option A's obligation #3.
- HOW to run the proofs (concurrent-claim SQL, RLS inspection, typecheck, advisors) as reusable
  scripts → **regala-diagnostics-and-verification**.
- Getting the migration / env / dependency change APPROVED and merged, and the four non-negotiables in
  full → **regala-change-control**.
- Structuring the open research questions (latency budgets, connection-scaling) as a rigorous
  investigation → **regala-research-methodology** (candidate sibling; if absent, use
  regala-diagnostics-and-verification's measurement discipline).

---

## Provenance and maintenance

All facts verified 2026-07-12 against the repo at `/home/user/regala.me` and the live Supabase project
`esyybmnwalscpnzfeowh` (region sa-east-1). Re-verify anything that can drift:

| Fact | Re-verify with |
|------|----------------|
| `UNIQUE(item_id)` still present | `select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.claims'::regclass and contype='u';` → expect `UNIQUE (item_id)` |
| `claims` NOT yet replicated (publication empty) | `select * from pg_publication_tables where pubname='supabase_realtime';` → expect no `public.claims` row until the migration lands |
| No browser Supabase client / no `NEXT_PUBLIC_` Supabase key yet | `grep -rn "NEXT_PUBLIC_SUPABASE\|createBrowserClient" apps/web` → expect no hits as of 2026-07-12 |
| claims RLS lets anon read public/link_only | `select policyname, cmd, roles, qual from pg_policies where tablename='claims';` |
| Current gifter mechanism unchanged (no subscription) | `grep -n "channel\|postgres_changes\|onClaimed\|localClaimed" apps/web/app/[username]/[slug]/gifter-items.tsx` |
| Code is green | `pnpm --filter web typecheck` and `pnpm --filter shared test` |

Stale-doc note: CLAUDE.md §12 lists real-time claim updates as an OPEN gap (#3) and does not yet
document the replication requirement — that is correct as of 2026-07-12 (the feature is unbuilt). Do
not edit CLAUDE.md except through regala-change-control / regala-docs-and-writing when this ships.
