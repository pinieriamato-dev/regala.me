#!/usr/bin/env bash
# extraction-smoke.sh — smoke-test the UPSTREAM MercadoLibre API that the product-extraction
# route depends on, in isolation. It does NOT hit our own /api/extract-product endpoint
# (that route requires an authed Supabase session cookie and returns 401 "No autorizado"
# otherwise — see apps/web/app/api/extract-product/route.ts). This tests the data source,
# not our route.
#
# Our regular-listing fast path calls: https://api.mercadolibre.com/items/<normalizedId>
# (route.ts line ~148, fetchMercadoLibreItem). The route reads data.title, data.price,
# and data.pictures[0].secure_url from the JSON below. This script shows that raw shape.
#
# Usage:
#   ./extraction-smoke.sh                 # uses a sample MLA (Argentina) item id
#   ./extraction-smoke.sh MLB1234567890   # pass any ML item id (MLA/MLB/MLM/MLC/MCO/MLU...)
#
# INTERPRETATION:
#   * HTTP 200 + a JSON body with "title","price","pictures" -> upstream shape is intact;
#     if OUR route still returns nothing, the bug is in our parsing/auth, not the source.
#   * HTTP 401/403 -> ML is geo-blocking this IP or now requires auth for this id. This is a
#     KNOWN degradation path (dossier §8): Vercel datacenter IPs get blocked, catalog /p/
#     pages need ML OAuth creds, and the route falls back to a slug-derived title. A 401 here
#     is a finding, not necessarily a bug in our code.
#   * HTTP 404 -> the sample id is dead; pass a live id as $1.

set -euo pipefail
ITEM_ID="${1:-MLA811364689}"           # replace with a known-live id if this one 404s
NORMALIZED="${ITEM_ID//-/}"            # route strips a hyphen: itemId.replace('-','')
URL="https://api.mercadolibre.com/items/${NORMALIZED}"

echo "== GET ${URL} =="
# -w prints the status; -s silences progress; head keeps the body readable.
STATUS=$(curl -sS -o /tmp/ml_smoke_body.json -w '%{http_code}' -H 'Accept: application/json' "${URL}" || echo "000")
echo "HTTP ${STATUS}"
echo "-- body (first 40 lines) --"
head -c 4000 /tmp/ml_smoke_body.json | (command -v jq >/dev/null 2>&1 && jq '{id, title, price, first_picture: (.pictures[0].secure_url // .pictures[0].url)}' 2>/dev/null || cat)
echo
echo "== done (status ${STATUS}) =="
