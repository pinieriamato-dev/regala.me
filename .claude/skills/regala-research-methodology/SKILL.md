---
name: regala-research-methodology
description: >
  The evidence discipline for regala.me — how a hunch becomes an accepted change here, and the bar it must clear first. Load this when you are about to CLAIM something is fixed/works/proven, when you are DECIDING whether an idea is worth building, when you want to run an experiment or add a feature flag, or when you catch yourself "eyeballing" a fix ("looks right", "should work"). Triggers: "is this actually fixed?", "how do I prove X?", "should we build this?", "add a feature flag / env flag to try this", "why did that change get accepted?", "predict the number before running", writing an experiment up, promoting or retiring an idea, deciding where the next batch of work comes from. Also load before touching CLAUDE.md §12 "Known Gaps" or TODOS.md as a candidate ledger. Do NOT load this to actually RUN a diagnostic (that is regala-diagnostics-and-verification), to read the chronicle of past bugs (regala-failure-archaeology), to gate/merge a change (regala-change-control), or to pick the NEXT frontier bet (regala-research-frontier). This skill is the method; those are the mechanics.
---

This skill is the **research method** for regala.me: the evidence bar every claim must clear, the "predict the number before you run" rule, and the lifecycle that turns a hunch into an adopted change or a documented retirement. Read it if you are a junior engineer or a Sonnet-class model about to say "it's fixed" or "we should build this" — before you say it.

Jargon defined once, on first use:
- **Evidence bar** = the minimum proof required before a claim counts as true here.
- **Hypothesis** = a falsifiable statement about how the system behaves, written *before* you test it.
- **Candidate / candidate ledger** = an idea that has been written down but not yet proven; the ledgers are `TODOS.md` and `CLAUDE.md §12 "Known Gaps"`.
- **Guarded experiment** = a change you can turn on/off without a redeploy, so a bad result costs nothing. In this repo the on/off switch is an **environment variable** (env vars ARE the feature-flag mechanism — see `regala-config-and-env`).
- **Dogfooding** = the team using their own app and filing the bugs they hit.

---

## When NOT to use this / use instead

| You actually want to… | Load this sibling instead |
|---|---|
| Run the proof (SQL, typecheck, concurrent-claim script, advisors) | `regala-diagnostics-and-verification` |
| Read the settled history of a specific bug / dead end | `regala-failure-archaeology` |
| Get a change reviewed / merged / through the gate | `regala-change-control` |
| Choose the NEXT big bet or frontier problem to chase | `regala-research-frontier` |
| Wire the actual env/feature flag | `regala-config-and-env` |

This skill tells you *how to know you're right*. The siblings do the work once you've decided.

---

## 1. The evidence bar (three tests every claim must pass)

A claim is not accepted here until it clears **all three**. Skipping any one is how this repo shipped regressions before.

### Test A — One mechanism explains ALL observations, including the negatives
A real root cause explains every symptom you saw *and* everything you did **not** see. If your explanation only covers the failing case but can't say why the neighboring case worked, it is incomplete — keep digging.

Worked example (settled, see `regala-failure-archaeology`): "every wishlist insert is rejected." The accepted mechanism was *the code inserted a non-existent `is_public` column after the schema had moved to `privacy_level`.* That single mechanism explains the positive (all inserts fail) **and** the negative (reads still worked, because reads never touched `is_public`). A weaker guess like "Supabase is down" fails Test A — it can't explain why SELECTs succeeded.

### Test B — Measured, not eyeballed
"Looks right", "should work", "I think that fixed it" do **not** clear the bar. You must observe the corrected behavior with a tool. The cheapest measurement is almost always the right first one:

| Claim | Minimum measurement | Owned by |
|---|---|---|
| "The code is green" | `pnpm --filter web typecheck` (+ `shared`, `mobile`) exits 0 | `regala-diagnostics-and-verification` |
| "The only test suite passes" | `pnpm --filter shared test` → 13 tests pass (verified 2026-07-12) | same |
| "RLS blocks anon on private lists" | query `pg_policies` / reproduce as anon | same |
| "No new security regressions" | `get_advisors type=security` diff before/after | same |
| "Two gifters can't double-claim" | concurrent-claim experiment (see §2) | same |

If you cannot state the measurement you ran, you have not met Test B. Do not write "fixed" in a commit or a reply.

### Test C — Survive the adversarial pass ("how would this be wrong?")
Before accepting your own conclusion, argue *against* it for one minute. Ask:
- What observation would I expect if my explanation were **false**? Did I check for it?
- Is there a simpler mechanism that fits the same evidence?
- Am I confusing correlation ("I changed X and it started working") with cause?
- Does this contradict a known non-negotiable or a settled battle? (Cross-check `regala-change-control` and `regala-failure-archaeology` — re-litigating a settled fix is the most common wrong turn here.)

Only a claim that survives A + B + C is "accepted". Everything else is **open/candidate**, and must be labeled that way.

---

## 2. Hypothesis predicts the number FIRST

The core discipline: **before you run anything, write down the observation or number you expect.** Then run it and compare. If reality disagrees with your prediction, your model is wrong — and finding that out is the whole point. Predicting *after* seeing the result teaches you nothing (you'll rationalize any outcome).

Rule of thumb: if you can't state a predicted number, you don't yet have a hypothesis — you have a hope.

### Worked example 1 — the LATAM price bug (predict, then measure)
Symptom: a price entered as `66500` was stored as `66.5`.

- **Hypothesis:** an `<input type="number">` reading the es-AR string `"66.500"` treats `.` as a decimal point, so the browser hands the form `66.5`. (In Argentine Spanish `.` is the *thousands* separator and `,` is the decimal — the opposite of en-US.)
- **Predicted numbers, written before touching code:**
  - `"66.500"` currently persists as `66.5` (the bug).
  - After switching to `type="text" inputMode="decimal"` + normalizing in Zod, `"66.500"` must persist as `66500`, `"66,5"` as `66.5`, and `"1.234,56"` as `1234.56`.
- **Experiment:** the normalizer that shipped in `apps/web/app/dashboard/actions.ts` `addItemSchema.price` (lines 21–40, verified 2026-07-12):

  ```ts
  const lastComma = s.lastIndexOf(',')
  const lastDot   = s.lastIndexOf('.')
  if (lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(',', '.')        // comma is decimal
  } else if (lastDot > -1 && lastComma === -1 && s.slice(lastDot + 1).length === 3) {
    s = s.replace(/\./g, '')                          // period is thousands
  }
  ```
- **Result:** the three predicted numbers matched. Fix accepted (commit `96df9e0 fix: 4 bugs — price parsing, ...`).
- **Decision: ADOPT.**

Note the shape: the *predictions* were concrete numbers (`66500`, `66.5`, `1234.56`), so the experiment could only pass or fail — no room to eyeball. That is Test B done right.

### Worked example 2 — the concurrent-claim proof (predict the exact outcome)
Question: can two gifters claim the same item?

- **Hypothesis:** the DB constraint `UNIQUE(item_id)` on `claims` (`claims_item_id_unique`, migration `add_unique_claim_per_item`) makes a second claim impossible at the data layer, regardless of UI timing.
- **Predicted numbers, before running:** fire two `INSERT`s into `claims` for the *same* `item_id`. Exactly **1** succeeds; exactly **1** fails with Postgres error code **`23505`** (unique violation). Not 2 successes, not 0.
- **Experiment:** the concurrent-claim race repro (run it via `regala-diagnostics-and-verification`). The app maps that `23505` to a friendly Spanish message — verified in `apps/web/app/[username]/[slug]/actions.ts:37`:

  ```ts
  if (error.code === '23505') return { error: '¡Ya alguien lo reclamó! Elegí otro regalo.' }
  ```
- **Result:** one insert wins, one returns `23505`. Prediction matched → correctness is guaranteed at the DB layer even though the gifter UI does not yet live-update (that stale-view UX gap is the `regala-realtime-claims-campaign` frontier, not a correctness bug).
- **Decision: ADOPT the constraint as the invariant; do NOT weaken it** (this is a non-negotiable — see §4 and `regala-change-control`).

The lesson from both examples: a hypothesis that commits to a number *before* the run is falsifiable in one shot. A hypothesis that only says "should be better" can't fail, so it can't teach.

---

## 3. The idea lifecycle

Every idea travels this path. Do not skip stages; skipping is how unproven changes get shipped.

```
 hunch
   │  write it down (don't trust memory)
   ▼
 CANDIDATE  ── recorded in TODOS.md (deferred format) or CLAUDE.md §12 "Known Gaps"
   │  give it a guard you can turn off
   ▼
 GUARDED EXPERIMENT ── gated behind an env var (regala-config-and-env), off by default
   │  predict the number, then run (§2)
   ▼
 MEASURED  ── cleared the evidence bar A+B+C (§1)?
   ├── YES ──▶ ADOPT via change-control (regala-change-control): schema/policy/env
   │            changes go through the gate; document in CLAUDE.md in the same change.
   └── NO  ──▶ RETIRE with a one-line reason recorded in regala-failure-archaeology
                so nobody re-fights it.
```

### Stage details

**Hunch → Candidate.** Write it in the right ledger, in the house format:
- `TODOS.md` uses **What / Why / Effort / Depends on** (see the existing entries — mirror that exactly; `regala-docs-and-writing` owns the format).
- `CLAUDE.md §12` is the numbered gap table — a candidate ledger of known-missing things (image upload, mobile brutalist, realtime, etc.). Note: CLAUDE.md is edited ONLY through change-control, never ad-hoc.

**Candidate → Guarded experiment.** In this repo the flag mechanism is an **environment variable**, read server-side, default-off. Precedent (verified 2026-07-12):
- `HCAPTCHA_SITE_KEY` — unset ⇒ captcha disabled; set ⇒ widget rendered and required.
- `ML_CLIENT_ID` / `ML_CLIENT_SECRET` — unset ⇒ MercadoLibre catalog OAuth path skipped (degrades to slug-title); set ⇒ the `/products/` API path is attempted.

Follow that pattern: a new capability reads a new env var, behaves safely when it's absent, and turns on only where the var is set. Never hard-wire an experiment into the always-on path. (Wiring details: `regala-config-and-env`.)

**Guarded experiment → Measured.** Predict the number (§2), run the cheapest sufficient measurement (§1 Test B), then the adversarial pass (Test C).

**Measured → Adopt OR Retire.**
- **Adopt:** route the real change (schema, RLS policy, env default, dependency, design class) through `regala-change-control`. Schema changes are Supabase MCP migrations documented in CLAUDE.md §3 in the same change — non-negotiable #2. Do not route around the gate because your experiment "obviously worked".
- **Retire:** record a one-line reason in `regala-failure-archaeology`. A retired idea with a reason is a permanent saving — it stops the next engineer (or the next model) from re-running the same dead end. A retired idea with no written reason will be re-attempted.

---

## 4. Where good ideas have actually come from here

Be honest about the track record. The accepted improvements in this repo did **not** come from grand up-front design. They came from two sources — bias toward both.

1. **Batched real user / dogfooding feedback.** The two highest-yield commits in the history are literally batches of user-surfaced bugs (verified in `git log`, 2026-07-12):
   - `96df9e0 fix: 4 bugs — price parsing, image field, extraction feedback, real-time stats`
   - `445c703 fix: 9 user feedback bugs — auth, ML extraction, priority sort, edit items, nav, surprise view`

   Users hit a real edge (an es-AR price, a broken share URL, a mobile add that always errored), reported it, it got batched and fixed, and the fix was *measured* against the reported symptom. This is the dominant, most reliable idea source.

2. **Dogfooding turning up the next edge.** Fixing one batch surfaces the next (the ML-extraction saga is round after round of "the previous fix revealed the next blocker"). Expect the same: ship small, watch it in use, let the next batch surface itself.

**Operating bias that follows from this history:** prefer shipping the smallest correct change, measuring it against a real reported symptom, and letting users surface the next batch — over speculative large builds. The four non-negotiables (zero-friction claims; schema-via-MCP-migrations; never commit secrets; brutalist design purity — see `regala-change-control`) are the *only* things that are settled up-front and not subject to experiment. Everything else earns its place by clearing the evidence bar.

---

## 5. The template (copy this into any experiment write-up)

Keep experiment notes in this exact five-line shape. It forces the prediction *before* the result and forces a decision at the end.

```
Hypothesis:        <falsifiable statement about how the system behaves>
Predicted numbers: <the exact observation/number you expect BEFORE running>
Experiment:        <the guarded change + the measurement you will run>
Result:            <what you actually observed — does it match the prediction?>
Decision:          ADOPT (→ change-control) | RETIRE (→ failure-archaeology, one-line reason)
```

Filled example (price bug):
```
Hypothesis:        type=number misreads es-AR "66.500" as 66.5 (dot = thousands, not decimal).
Predicted numbers: pre-fix "66.500"→66.5 (bug); post-fix "66.500"→66500, "66,5"→66.5, "1.234,56"→1234.56.
Experiment:        text input + Zod LATAM normalizer in addItemSchema.price; enter the 3 strings, read DB.
Result:            all 3 matched post-fix predictions.
Decision:          ADOPT — commit 96df9e0.
```

---

## Provenance and maintenance

Verified 2026-07-12 against the repo and the live Supabase project (`esyybmnwalscpnzfeowh`). Re-verify anything volatile:

| Fact | One-line re-verification |
|---|---|
| The two batched-feedback commits exist | `git log --oneline \| grep -E "9 user feedback bugs\|4 bugs"` |
| LATAM price normalizer lines | `grep -n "lastComma\|lastDot" apps/web/app/dashboard/actions.ts` |
| `23505` → friendly claim error | `grep -n "23505" "apps/web/app/[username]/[slug]/actions.ts"` |
| `UNIQUE(item_id)` still the claim guard | `execute_sql`: `select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.claims'::regclass` |
| Only automated suite = shared, 13 tests | `pnpm --filter shared test` |
| Env vars are the flag mechanism | `grep -rn "process.env.HCAPTCHA_SITE_KEY\|process.env.ML_CLIENT_ID" apps/web` |

Could NOT independently verify (flagged as candidate, not fact):
- The `avatars` storage bucket referenced by `apps/web/app/api/upload-avatar/route.ts` was not confirmed to exist on 2026-07-12 (MCP disconnected mid-check per dossier §3). Treat avatar-upload experiments as depending on an unverified precondition — confirm the bucket before predicting upload success.

Stale-doc notes (state the verified fact; do NOT edit CLAUDE.md except via change-control):
- CLAUDE.md §3 still lists `wishlists.is_public`; the DB uses `privacy_level` (migration `add_privacy_level_replace_is_public`). CLAUDE.md §3 is stale here.
- TODOS.md "Duplicate claim prevention" describes `UNIQUE(item_id, claimer_name)`; the SHIPPED constraint is `UNIQUE(item_id)` (one claim per item). TODOS.md is stale here.
