---
name: regala-docs-and-writing
description: >
  Read this BEFORE writing or editing any regala.me DOCUMENTATION (CLAUDE.md, TODOS.md, this
  skills library) or any USER-FACING COPY (Spanish product strings, landing-page/marketing text,
  button/CTA labels, testimonials, FAQ, OG/metadata text, email/nudge copy). Load it when the task
  says "update the docs", "add a TODO", "document this change", "fix the copy/wording", "translate
  this string", "write the CTA", "the tagline", or when you touch Argentine-Spanish strings in
  page.tsx / claim-button.tsx / gifter pages. It owns doc STYLE and the product's written VOICE:
  house style, voseo rules, the hard copy prohibitions ("gratis para siempre", Google Sheets /
  WhatsApp as primary CTA, fake testimonials), the TODOS.md format, and the CLAUDE.md-sync template.
  Do NOT load it to decide whether a schema/env change is ALLOWED or to run the review — that is
  regala-change-control. It does NOT authorize schema edits; it only tells you how to WRITE THEM DOWN.
---

This skill is the style guide for **what regala.me writes down and how it speaks** — the docs of
record and the product's Argentine-Spanish voice. Read it if you are a mid-level engineer or a
Sonnet-class model about to edit a doc or a user-facing string. It does not decide whether a change
is permitted (that gate is `regala-change-control`); it decides how the change is *documented* and
how any copy *reads*.

Jargon, defined once:
- **Doc of record** = a file the whole team treats as authoritative truth (here: `CLAUDE.md`).
- **Drift** = the doc says one thing, the running code/DB does another. Drift in a doc of record is
  a defect: it silently teaches the next reader a falsehood.
- **voseo** = the Río de la Plata second person: `vos` instead of `tú`, with its own imperative
  form (`Armá`, `Elegí`, `Reclamá`) — NOT the Iberian `Arma`, `Elige`, `Reclama`.
- **Change-control** = the sibling skill/process that decides what review a change needs before it
  ships. This skill routes *to* it; it never routes *around* it.

---

## The docs of record — who owns what

| Doc | Path | Owns | Format contract |
|---|---|---|---|
| **The manifest** | `/home/user/regala.me/CLAUDE.md` | Schema (§3), env vars (§4), design system (§8), "what the user cares about" (§14), known gaps (§12). The single source an agent reads first. | Prose + tables. Sections are numbered and referenced elsewhere as "§N" — keep the numbering stable. |
| **The backlog** | `/home/user/regala.me/TODOS.md` | Deferred work, grouped by priority band (P2/P3). | Each item is a `### Title` + four bold fields: **What / Why / Effort / Depends on** (see template below). |
| **This skills library** | `/home/user/regala.me/.claude/skills/regala-*/SKILL.md` | Deep runbooks that CLAUDE.md points *toward*. One home per fact; cross-reference, don't duplicate. | YAML frontmatter (`name` kebab-matches dir + trigger-rich `description`) + body with "When NOT to use" and "Provenance and maintenance" sections. |

Rule of one home: a fact lives in exactly ONE of these. CLAUDE.md holds the canonical schema/env/design
facts; skills hold the runbooks; TODOS holds the not-yet-done. If you find yourself copying a fact,
link instead.

---

## Non-negotiable: CLAUDE.md schema/env sections update IN THE SAME CHANGE

CLAUDE.md §3 (schema) and §4 (env vars) are **contracts with the database and the deploy
environment**, not commentary. The project's second non-negotiable (see `regala-change-control`) is:
*schema changes go through Supabase MCP `apply_migration` AND are documented in CLAUDE.md §3 in the
same change.* The same discipline applies to env vars in §4.

Checklist for any DB or env change (the writing half — the *gating* half is change-control's):

- [ ] Migration applied via Supabase MCP `apply_migration` (never an ad-hoc `.sql` file in the repo).
- [ ] CLAUDE.md §3 (or §4) edited in the **same** change to match the new reality.
- [ ] Any skill that quotes the old column/env is updated or cross-linked (grep for the old name).
- [ ] The change is routed through `regala-change-control` — this skill does NOT authorize the edit.

This skill owns doc STYLE. It does **not** authorize a schema edit. If you are tempted to "just update
CLAUDE.md to match the code", stop: either the code is wrong (a bug — see `regala-failure-archaeology`)
or the doc drifted and needs a *documented* correction routed through change-control.

### Current known drift in CLAUDE.md — fix these next time you touch those sections

These were verified against the live DB and repo on 2026-07-12. Do not silently repeat CLAUDE.md where
it is stale; state the verified fact and, in a doc, note "CLAUDE.md §X is stale here". Do NOT edit
CLAUDE.md outside change-control just to fix these — batch them into the next legitimate change to that
section.

| # | CLAUDE.md says | Verified truth (2026-07-12) | Section to fix |
|---|---|---|---|
| 1 | `wishlists.is_public BOOL default true` | Column **removed**; it's `privacy_level text default 'public'` (`'public'|'link_only'|'private'`). | §3 |
| 2 | `profiles(id, username, display_name, avatar_url, created_at)` | Also has **`bio text`** and **`birthday date`**. | §3 |
| 3 | Env = SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SITE_URL | Also real & undocumented: **`HCAPTCHA_SITE_KEY`, `ML_CLIENT_ID`, `ML_CLIENT_SECRET`** (all optional). | §4 |
| 4 | `priority INT` (implies no default) | DB default `priority = 2`; web Zod defaults **1**; mobile defaults **2** — three-way inconsistency, document it as-is. | §3 |
| 5 | (TODOS/spec imply) unique on `(item_id, claimer_name)` | Shipped constraint is **`UNIQUE(item_id)`** — one claim per item, period; duplicate → Postgres `23505`. | §3 / TODOS |
| 6 | avatar upload targets bucket `avatars` | Bucket existence **UNVERIFIED** (MCP disconnected mid-check 2026-07-12) — label "candidate", verify before relying. | §12 / §3 |

Full facts and the incidents behind each live in the DOSSIER and in `regala-change-control` /
`regala-architecture-contract` — cross-reference, don't re-derive here.

---

## The product voice — Argentine Spanish, brutalist tone

regala.me speaks **rioplatense Spanish** (Buenos Aires) to a LATAM audience. The voice is confident,
warm, a little cheeky, never corporate. It matches the brutalist web design (see
`regala-nextjs-app-router` / CLAUDE.md §8 for the visual system): loud, plain, no filler.

### Voseo — the single most important rule

Use `vos`, not `tú`. Imperatives take the voseo form (stress on the last syllable, written accent):

| Do (voseo) | Never (tuteo) | Meaning |
|---|---|---|
| **Armá** tu lista | Arma tu lista | Build your list |
| **Elegí** el tuyo | Elige el tuyo | Pick yours |
| **Reclamá** lo suyo | Reclama lo suyo | Claim what's theirs |
| **Pegá** el link | Pega el link | Paste the link |
| **Mandá** el link | Manda el link | Send the link |
| **Compartí** una lista | Comparte una lista | Share a list |
| ¿**Tenés** un cumple? | ¿Tienes un cumpleaños? | Got a birthday? |
| ¿**Querés** hacer tu lista? | ¿Quieres hacer tu lista? | Wanna make your list? |

Real strings already shipped, to copy the register from (all verified in source):
- Landing steps (`apps/web/app/page.tsx:5-9`): "Armás tu lista", "Mandás el link", "Reclaman lo suyo".
- Viral footer on every gifter page (`apps/web/app/[username]/[slug]/page.tsx:142-147`):
  `¿QUERÉS HACER TU PROPIA LISTA?` → button `CREAR LISTA GRATIS →`.
- Post-claim nudge (`apps/web/app/[username]/[slug]/claim-button.tsx:35-38`):
  `¿TENÉS UN CUMPLE PRÓXIMAMENTE?` / `Armá tu lista en 2 min →`.
- Zero-friction reassurance under the claim form (`claim-button.tsx:82`): `NO HACE FALTA CREAR CUENTA`.
- Claim CTA (`claim-button.tsx:67,95`): `ME ENCARGO →`.

### Casing, punctuation, flavor

- **Display headlines are UPPERCASE** and rendered with the `.rg-display` font (Archivo Black). Write
  copy meant for a headline in caps, or let the CSS uppercase it — but the *string* in code often
  already carries the caps (e.g. `CREAR LISTA GRATIS →`). Match what's around it.
- **Highlight a key word** by wrapping it in `<span className="rg-em">WORD</span>` (yellow box). One or
  two words per headline, never a whole sentence.
- **Trailing `→`** on primary CTAs is the house style (`EMPEZAR →`, `ME ENCARGO →`, `CREAR MI LISTA →`).
- Local flavor is welcome and on-brand: "quilombo" (a mess), "un cumple", "fernet", "desde BA". The
  footer literally reads `hecho con · café · y · fernet · en BA` (`page.tsx:304`). Keep it human.
- Multi-currency copy names the codes explicitly (`page.tsx:46`: "ARS, BRL, MXN, CLP, COP, EUR, USD").

---

## HARD copy rules — do not violate

These come from CLAUDE.md §14 ("What the user cares about") and are user-confirmed. They are
prohibitions, not preferences.

| Rule | Why | What to write instead |
|---|---|---|
| **Never say "gratis para siempre"** (free forever). | Dishonest about a possible future premium tier; the user explicitly forbids it. | Be honest and time-bounded. Shipped example (`page.tsx:43`): "Hoy, no. … Si en algún momento agregamos premium, avisamos antes — y lo básico se queda como está." Plain "GRATIS" / "CREAR LISTA GRATIS" (free *now*) is fine. |
| **Do NOT use Google Sheets or WhatsApp as the PRIMARY CTA.** | Both were removed after user feedback; they anchor the product to the wrong mental model. | Primary CTA is always "create your list" (`CREAR MI LISTA →`, `EMPEZAR →`). WhatsApp may be *mentioned* as one share channel among "mensaje / mail", never as the headline action. |
| **Honest testimonials only — no fabricated quotes.** | Fake testimonials erode trust with users who know the founder personally. | The three quotes in `page.tsx:36-40` (Sofí M. / Lucía G. / Tomás L.) are **placeholders to be replaced with real quotes** — see the TODOS.md item "Replace fake testimonials with real quotes". Until real quotes exist, do not add more fake ones and do not present these as verified. (Note: that TODO cites `page.tsx:34-38`; the array is at `page.tsx:36-40` today — the line ref drifted, the file is truth.) |

Also keep the four project non-negotiables intact in copy: never imply an account is required to claim
(the opposite — `NO HACE FALTA CREAR CUENTA` — is a load-bearing promise).

---

## Template: a TODOS.md entry

Match the existing four-field shape exactly. Group under the right priority band (`## P2 …` / `## P3 …`).
Effort uses S/M/L, and when useful a human-vs-Claude-Code split like the existing entries.

```markdown
### <Short imperative title of the deferred work>
**What:** <Concrete, testable description. Name the files/functions if known, e.g. `claim-button.tsx` done state.>
**Why:** <The user/product reason it matters. One or two sentences. This is what justifies the priority.>
**Effort:** <S | M | L>  (optional split: `M (human: ~1 day / CC: ~1 hour)`)
**Depends on:** <Blocking item, or "None.">
```

---

## Template: documenting a schema change in CLAUDE.md §3

Use this AFTER the migration is applied via Supabase MCP and AFTER `regala-change-control` has cleared
the change. This is the *writing* step, not permission. Edit the relevant table block in CLAUDE.md §3 so
the columns/constraints listed match the live DB one-for-one, then add a migration note.

```markdown
<!-- In CLAUDE.md §3, update the table's column list to the new reality, e.g.: -->
items (
  id PK, wishlist_id → wishlists.id, title, description nullable,
  price NUMERIC nullable, image_url nullable, url nullable,
  priority INT default 2,          -- 1=opcional 2=me gusta 3=esencial
  sort_order INT default 0, created_at TIMESTAMPTZ,
  <new_column> <TYPE> <null|default …>   -- <one-line purpose>
)

<!-- Then append to the migrations note under §3 "No migration files in repo": -->
Applied 2026-07-12 via `apply_migration`: `<version>_<name>` — <one line: what changed and why>.
```

After editing: `grep -rn "<old_or_new_column>" .claude/skills/ CLAUDE.md` to catch every doc that
mentions the column, and update or cross-link each. A schema fact must read identically everywhere it
appears — or, better, appear in only one place.

---

## When NOT to use this / use instead

| If you are… | Use instead |
|---|---|
| Deciding whether a schema/env/copy change is ALLOWED to ship, or running the review gate | `regala-change-control` |
| Changing how the web app talks to DB/auth/mutations, or reasoning about RLS/claims/privacy | `regala-architecture-contract` |
| Investigating a past bug / why a fix was made the way it was | `regala-failure-archaeology` |
| Running or verifying the app, typecheck, tests, QA of live behavior | `regala-validation-and-qa`, `regala-run-and-operate`, `regala-diagnostics-and-verification` |
| Doing external research and want the method for citing/verifying | `regala-research-methodology` |
| Learning the CSS class system / brutalist visual rules in depth | `regala-nextjs-app-router` + CLAUDE.md §8 |

This skill is only for *how things are written down and how copy reads*. It never authorizes a schema
edit and never overrides change-control.

---

## Provenance and maintenance

Verified 2026-07-12 against the repo and the live Supabase project (`esyybmnwalscpnzfeowh`). Volatile
facts to re-check if this skill feels stale:

- **Copy strings** quoted above (voseo examples, viral footer, nudge, testimonials): re-read the source,
  since copy changes often —
  `grep -n "QUERÉS HACER\|ME ENCARGO\|NO HACE FALTA\|gratis para siempre" apps/web/app/page.tsx apps/web/app/\[username\]/\[slug\]/*.tsx`
- **Testimonial line numbers** (`page.tsx:36-40`) and their placeholder status:
  `grep -n "TESTIMONIALS\|Sofí\|Lucía\|Tomás" apps/web/app/page.tsx`
- **TODOS.md format** (What/Why/Effort/Depends on): `sed -n '8,40p' TODOS.md` — confirm the four-field shape.
- **CLAUDE.md drift table**: re-verify columns/env against the live DB via Supabase MCP
  `execute_sql` (SELECT-only) and `grep -n "process.env\." apps/web -r`; the drift list is only as
  current as the last migration. See `regala-change-control` / DOSSIER for the authoritative facts.
- The `avatars` bucket (drift #6) remains **candidate/unverified** — confirm with a read-only
  `select id from storage.buckets where id='avatars';` before treating it as fact in any doc.
