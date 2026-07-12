---
name: regala-product-extraction
description: >
  The URL→product auto-fill subsystem — regala.me's stated differentiator and its most-churned
  code. Load this when working on or debugging `apps/web/app/api/extract-product/route.ts` or its
  client caller `apps/web/app/dashboard/[id]/add-item-form.tsx`; when the "PEGÁ EL LINK → LO
  LLENAMOS AUTOMÁTICAMENTE" box returns wrong/empty data; when you see errors "No autorizado" (401),
  "URL inválida" (400), "No se pudo acceder al producto" (422), "No se pudo extraer el producto"
  (500), or "No se pudieron extraer datos"; when a MercadoLibre catalog `/p/` page fills nothing or
  only a Title-Cased slug; when a scraped page returns only the site name; or when touching
  ML_CLIENT_ID/ML_CLIENT_SECRET, getMLToken, the SSRF/DNS guard, or the OG/JSON-LD parsers.
  Do NOT load for: env-var setup mechanics (use regala-config-and-env), LATAM price *storage*
  parsing in the addItem Zod transform (that is the add-item flow, not extraction), or generic
  Supabase/RLS/auth debugging (use regala-diagnostics-and-verification / regala-debugging-playbook).
---

# regala-product-extraction

**What this is for:** everything about `GET /api/extract-product` — the endpoint that turns a pasted
product URL into `{title, description, image_url, price, url}` so the "add item" form pre-fills
itself. **Who should read it:** anyone debugging why extraction returned nulls, wrong data, or an
error, or changing the extraction pipeline. This is the user's stated differentiator ("paste a link,
auto-fill the item") and, per the failure archaeology, the single most-reworked file in the repo, so
read before you touch it.

The single source of truth is one file: **`apps/web/app/api/extract-product/route.ts`** (303 lines,
verified 2026-07-12). The only caller is **`apps/web/app/dashboard/[id]/add-item-form.tsx`**.

## When NOT to use this / use instead

| If you are… | Use instead |
|---|---|
| Setting up `ML_CLIENT_ID` / `ML_CLIENT_SECRET` / `HCAPTCHA_SITE_KEY` env vars | **regala-config-and-env** |
| Debugging how a price *string* is normalized on save (es-AR `.`/`,` in the `addItem` Zod transform) | the add-item flow / **regala-diagnostics-and-verification** (this endpoint does NOT parse LATAM number formats — it returns a raw JS `Number`) |
| Debugging Supabase auth / RLS / the 401 itself at the session level | **regala-diagnostics-and-verification**, **regala-debugging-playbook** |
| Running a general "why is X broken" investigation | **regala-debugging-playbook** |

---

## 1. Endpoint contract

`GET /api/extract-product?url=<url-encoded absolute URL>`

- **AUTH REQUIRED.** First thing the handler does: `createServerSupabase()` → `auth.getUser()`; if no
  user, returns `{ error: 'No autorizado' }` **401**. This closed a real open-proxy/SSRF hole (commit
  67e5a57). You cannot hit this endpoint with a plain `curl` — you need an authed session cookie. See
  §6 for how to test.
- The `url` param must be a single already-encoded absolute URL. The client encodes with
  `encodeURIComponent(...)`.
- **Success shape (always these 5 keys):**
  ```json
  { "title": string|null, "description": string|null, "image_url": string|null, "price": number|null, "url": string }
  ```
  `url` echoes back the caller's raw input string (`rawUrl`), not the final redirected URL. Any of the
  other four can be `null` — the endpoint returns 200 even when it found nothing.
- **Error responses** (JSON `{ error: "<Spanish>" }` + status):

  | Status | `error` string | Cause |
  |---|---|---|
  | 401 | `No autorizado` | not authenticated |
  | 400 | `URL requerida` | `url` param missing |
  | 400 | `URL inválida` | unparseable URL, non-http(s) protocol, **or private/blocked host** (see §2), or a redirect to a bad protocol/private host |
  | 422 | `No se pudo acceder al producto` | fetch not-ok, or >3 redirect hops, or a redirect with no `Location` |
  | 500 | `No se pudo extraer el producto` | any uncaught throw in the try block |

- **`price` is a raw `Number`.** No LATAM `.`/`,` normalization happens here (that lives in the
  `addItem` Zod transform on save). The client rounds it with `String(Math.round(data.price))` before
  putting it in the form field.

---

## 2. The pipeline (numbered flow)

Handler `GET(request)`, top to bottom:

1. **Auth guard.** `auth.getUser()`; no user → 401 `No autorizado`.
2. **Param + URL validation.** `url` missing → 400 `URL requerida`. `new URL(rawUrl)` throws → 400
   `URL inválida`. Protocol not in `['http:','https:']` → 400 `URL inválida`.
3. **SSRF defense (`isPrivateHost`).** DNS-resolves the hostname (`dns.lookup(hostname, {all:true})`)
   and blocks if **any** resolved address matches:
   - `PRIVATE_IPV4 = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.|0\.0\.0\.0)/`
   - `PRIVATE_IPV6 = /^(::1$|fc|fd|fe80:)/i`
   - **DNS lookup failure → treated as private → blocked** (`catch { return true }`). A domain that
     doesn't resolve returns 400 `URL inválida`, not a fetch error.
   - This defeats DNS-rebinding: we resolve first, then block on the actual IP. It is **re-run on every
     redirect hop** (step 6) so a public host can't 302 you to `169.254.169.254` (cloud metadata).
4. **MercadoLibre fast path** (only if `ML_HOSTNAME_RE = /mercadolibre\.|mercadopago\.|mercadoshops\./i`
   matches the hostname). Extract the item id with
   `ML_ITEM_ID_RE = /\b(ML[A-Z]-?\d+|MCO\d+)\b/i` (country codes: MLA=AR, MLB=BR, MLM=MX, MLC=CL,
   MCO=CO, MLU=UY, …). If an id is found, branch on the path:
   - **Catalog page** — `ML_CATALOG_PATH = /\/p\//i` matches `targetUrl.pathname` → `fetchMercadoLibreProduct(id, pathname)`
     (§3, path B). **Returns immediately** with that result (even if all-null) — the generic scrape is
     deliberately skipped for catalog pages because ML geo-blocks Vercel IPs (see §3).
   - **Regular listing** — else → `fetchMercadoLibreItem(id)` (§3, path A). Returns immediately **only
     if `mlData?.title`** is truthy; otherwise falls through to the generic path (step 5–7).
5. **Generic fetch** (non-ML hosts, or ML listing whose API call returned no title). Loop up to
   `MAX_HOPS = 3` with `redirect: 'manual'`, `FETCH_HEADERS` (Googlebot UA, `Accept: text/html…`,
   `Accept-Language: es-AR…`), `AbortSignal.timeout(8000)` (8s):
   - `3xx` → read `Location`, resolve against current URL, re-validate protocol + `isPrivateHost`
     (step 3), then continue. Exhausting hops, or a 3xx with no `Location` → 422.
   - non-`ok` (`!res.ok`) → 422 `No se pudo acceder al producto`.
   - `ok` → `readHtml(res)` (streams and stops at **200_000 bytes** = 200KB) → break.
6. **Extract fields from HTML:**
   - `siteName = getOGTag(html,'site_name')`; if absent, derive from hostname:
     `currentUrl.hostname.replace(/^www\./,'').split('.')[0]` (e.g. `mercadolibre`).
   - `title = getOGTag('title') ?? getMetaName('title') ?? getTagTitle('<title>')`, then
     `cleanTitle(rawTitle, hostSiteName)` (§4 — strips " | SiteName" and detects bot-block pages).
   - `description = getOGTag('description') ?? getMetaName('description')`.
   - `image_url = getOGTag('image')` (OG only — no `<img>` fallback).
   - `price = extractPrice(html)` (§4).
7. Return the 5-key object with `url: rawUrl`. Any uncaught throw anywhere in steps 4–7 → 500.

**Regexes, verbatim (route.ts lines 7–8, 113–115):**
```js
const PRIVATE_IPV4  = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.|0\.0\.0\.0)/
const PRIVATE_IPV6  = /^(::1$|fc|fd|fe80:)/i
const ML_HOSTNAME_RE  = /mercadolibre\.|mercadopago\.|mercadoshops\./i
const ML_ITEM_ID_RE   = /\b(ML[A-Z]-?\d+|MCO\d+)\b/i
const ML_CATALOG_PATH = /\/p\//i
```

---

## 3. The three MercadoLibre paths

ML is special-cased because scraping its HTML from Vercel's datacenter IPs is geo-blocked (ML serves
a bot-detection page, not the product). So ML uses its public/OAuth JSON APIs instead of HTML.

**Path A — regular listing (`fetchMercadoLibreItem`)** — WORKS, no creds needed.
- URL shape: `/MLA123…` (item id in the URL, no `/p/`).
- `normalizedId = itemId.replace('-','')` (turns `MLA-123` into `MLA123`).
- `GET https://api.mercadolibre.com/items/{normalizedId}` (public, 6s timeout). Returns
  `title`, `price` (only if `typeof === 'number'`), `image_url` from
  `pictures[0].secure_url ?? pictures[0].url`. `!res.ok` or no `title` → returns `null`.

**Path B — catalog page (`fetchMercadoLibreProduct`)** — **PARTIAL / degraded by design.**
- URL shape: `…/<slug>/p/MLA123…` (`/p/` present).
- Needs an OAuth token from **`getMLToken()`** (client-credentials grant, §below). With a token:
  - `GET /products/{id}` → `name` (title) + `pictures[0].url` (image).
  - `GET /products/{id}/items?limit=1` → `results[0].price` (price). Price failure is swallowed →
    price stays `null`, title/image still returned.
- **No creds, or the API call fails → slug-title fallback:** takes `pathname.match(/\/([^/]+)\/p\//i)`,
  splits the slug on `-`, Title-Cases each word, joins with spaces. **price and image_url are `null`.**
  So a catalog page with no ML creds yields e.g. `{title: "Apple Iphone 15 128 Gb", price: null, image_url: null}`.
  This is the "only a Title-Cased slug, no price/image" symptom.

**Path C — the `getMLToken` client-credentials flow** (feeds Path B):
- Module-level cache `mlTokenCache` survives across requests on a warm serverless instance. Reuses the
  token while `expiresAt > now + 60_000` (60s safety margin).
- Reads `process.env.ML_CLIENT_ID` and `process.env.ML_CLIENT_SECRET`. **If either is unset → returns
  `null`** (→ Path B falls back to slug title). This is the usual reason catalog extraction is degraded.
- `POST https://api.mercadolibre.com/oauth/token` with
  `grant_type=client_credentials`, 5s timeout. Non-ok or no `access_token` → `null`. TTL from
  `expires_in` (default **21600s** = 6h) × 1000.
- See **regala-config-and-env** for where these vars live and how to set them. They are undocumented in
  CLAUDE.md §4 (stale — CLAUDE.md §4 is stale here; it lists only the Supabase + site-URL vars).

**Why the geo-block matters:** production runs on Vercel; ML blocks those IPs for catalog HTML. That
is *why* the code never scrapes catalog HTML and instead relies on the OAuth API — and why, without
creds, catalog pages can only ever give you a slug-derived title. Regular listings (Path A) use a
different public API that is not geo-blocked, so they work regardless of creds.

---

## 4. Generic OG / JSON-LD / title extraction

For any non-ML site (and ML listings whose API returned nothing), fields come from the fetched HTML:

- **`getOGTag(html, property)`** — matches `<meta property="og:<property>" content="…">` in **both attr
  orders** (property-first and content-first), case-insensitive. Used for
  `og:site_name`, `og:title`, `og:description`, `og:image`, `og:price:amount`.
- **`getMetaName(html, name)`** — same two-order match for `<meta name="…">`; used for `title`,
  `description`, `product:price:amount` fallbacks.
- **`getTagTitle(html)`** — last-resort `<title>…</title>`, decodes `&amp; &lt; &gt; &#39;`.
- **`cleanTitle(title, siteName)`** — two jobs:
  1. Strips a trailing `" | SiteName"`, `" - SiteName"`, or en-dash variant (`[|\-–]`) — SiteName is
     regex-escaped first.
  2. **Bot-block detection:** if the whitespace-stripped, lowercased title *equals* the whitespace-
     stripped, lowercased siteName, returns `null`. This is why a bot-detection page whose `<title>` is
     just "Mercado Libre" yields `title: null` (the hostname-derived siteName is `mercadolibre`, and
     `"mercadolibre" === "mercadolibre"` after stripping spaces).
- **`extractPrice(html)`** — tries three sources **in order**, first hit wins:
  1. **JSON-LD**: every `<script type="application/ld+json">`, parsed; walks `offers` (array → `[0]`),
     reads `offer.price ?? offer.lowPrice` → `Number(...)`.
  2. **OG/meta**: `og:price:amount` ?? `product:price:amount` → `Number(...)`.
  3. **Regex**: first `"price"\s*:\s*(\d+(?:[.,]\d+)?)` in the raw HTML → `parseFloat` (comma→dot),
     kept only if `> 0`.
  - Returns the **raw number** — no thousands/decimal locale handling. If a site's JSON-LD price is in
    a different unit or a bad match fires from the regex, the wrong number propagates. Diagnose by
    checking which of the three sources fired (see §5).

---

## 5. Symptom → cause table

| Symptom (what the user sees) | Most likely cause | Where to confirm |
|---|---|---|
| Toast **"No se pudieron extraer datos. Completá el formulario manualmente."** | Endpoint returned 200 but all four data fields null (client check `data.title \|\| data.description \|\| data.price \|\| data.image_url`, add-item-form.tsx:39) | It's a *content* miss, not an HTTP error — inspect the actual JSON (§6) |
| **401 / "No autorizado"** | Not authenticated. The endpoint requires a Supabase session cookie | Are you logged in? Testing with bare `curl` always 401s (§6) |
| **Catalog `/p/` page: only a Title-Cased slug, price + image null** | No ML OAuth creds (or ML API failed) → `fetchMercadoLibreProduct` slug fallback (§3 path B). Expected/degraded-by-design | Are `ML_CLIENT_ID`+`ML_CLIENT_SECRET` set? (regala-config-and-env) |
| **Catalog `/p/` page: everything null** | ML creds absent AND slug regex `/\/([^/]+)\/p\//` didn't match the pathname (unusual URL) | Check the pathname actually contains `<slug>/p/` |
| **Generic site: only the site name comes back (or title null)** | Bot-block page; `cleanTitle` stripped title==siteName → null. Site served us a challenge page, not the product (Googlebot UA not enough) | Fetch the URL with the Googlebot UA yourself and look at `<title>` |
| **Generic site: title null but you expected OG tags** | Site has no OG tags, or blocked our fetch (422 would show if not-ok; 200+null means fetched but no tags), or content is client-rendered (we only read 200KB of initial HTML) | §6 — inspect raw HTML |
| **Price is wrong** | Which of the 3 `extractPrice` sources fired? JSON-LD vs OG vs the loose `"price":N` regex — the regex can match an unrelated JSON field | §4 order; grep the HTML for `ld+json` and `"price"` |
| **422 / "No se pudo acceder al producto"** | Fetch not-ok (403/404/5xx from target), >3 redirect hops, or a 3xx with no Location | Try fetching the URL directly to see its status |
| **400 / "URL inválida"** | Unparseable URL, non-http(s), private/blocked host, DNS didn't resolve, or a redirect to a private host | Does the hostname resolve to a public IP? |
| **500 / "No se pudo extraer el producto"** | Uncaught throw (e.g. a malformed response mid-parse). Rare | Check server logs for the stack |
| **ML listing (`/MLA…`, no `/p/`) returns nothing** | `api.mercadolibre.com/items/{id}` was not-ok or item has no title → fell through to generic scrape which ML geo-blocks | Curl the ML items API directly (§6) |

---

## 6. How to test a single URL safely

**A. Test the endpoint end-to-end (needs an authed cookie).** Bare curl 401s. Options:
- Log in through the UI at `/auth`, open the dashboard, paste the URL into the "PEGÁ EL LINK" box, and
  watch the Network tab request to `/api/extract-product?url=…` — the JSON response is the ground truth.
- Or copy your session cookie from the browser and replay it:
  ```bash
  # dev server: pnpm dev:web  (next dev --port 3000; CLAUDE.md notes 3000 is often taken → 3001)
  curl -s 'http://localhost:3000/api/extract-product?url=<URL-ENCODED>' \
    -H 'Cookie: <paste your sb-...-auth-token cookies from the browser>'
  ```
  Without the cookie you will only ever get `{"error":"No autorizado"}`.

**B. Test the ML APIs in isolation (no auth, no server needed).** This is the fastest way to tell
whether ML or our code is at fault:
```bash
# Regular listing (Path A) — public, should return title/price/pictures:
curl -s 'https://api.mercadolibre.com/items/MLA<digits>' | head -c 800
# Catalog product (Path B) — requires OAuth; without a token this 401s/403s (that's expected):
curl -s 'https://api.mercadolibre.com/products/MLA<digits>' | head -c 400
```
If the items API returns a good title but the app shows nothing, the bug is in our code path, not ML.

**C. Test generic OG extraction in isolation.** Fetch the target with the same Googlebot UA the endpoint
uses and inspect the meta tags — if the site returns a challenge page here, extraction will too:
```bash
curl -sL -A 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' \
  '<url>' | grep -ioE '<meta[^>]+(og:(title|image|price:amount|site_name)|application/ld\+json)[^>]*>' | head
```

**D. Cheapest gate after any edit:** `pnpm --filter web typecheck`.

---

## Provenance and maintenance

Verified **2026-07-12** against `apps/web/app/api/extract-product/route.ts` (303 lines) and
`apps/web/app/dashboard/[id]/add-item-form.tsx`, plus dossier §4/§7/§8.

Re-verify when things drift:
- Pipeline/regexes/error strings: `sed -n '1,303p' apps/web/app/api/extract-product/route.ts` — confirm
  `PRIVATE_IPV4`, `ML_ITEM_ID_RE`, `ML_CATALOG_PATH`, `MAX_HOPS`, `200_000`, the `getMLToken` env reads,
  and the Spanish error strings still match §1–§4.
- Client success-check + field mapping: `sed -n '30,62p' apps/web/app/dashboard/[id]/add-item-form.tsx`.
- ML creds presence (drives Path B): `grep -c ML_CLIENT_ apps/web/.env.local 2>/dev/null` (env files are
  git-ignored and not in the repo — see regala-config-and-env).
- Whether ML changed its APIs: run the §6-B curls.

**Stale-doc notes (do NOT edit CLAUDE.md except via regala-change-control):** CLAUDE.md §11 describes the
extractor accurately but §4's env list omits `ML_CLIENT_ID` / `ML_CLIENT_SECRET` (they are real —
CLAUDE.md §4 is stale here).

**Open/unproven:** whether ML catalog OAuth creds are currently configured in production is not verified
here — treat "catalog extraction returns full data in prod" as a candidate until you confirm the env
vars are set and the §6-A trace shows non-null price/image on a `/p/` URL.
