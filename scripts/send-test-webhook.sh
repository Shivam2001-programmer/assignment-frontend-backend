#!/usr/bin/env bash
set -euo pipefail

API_URL="${1:-http://localhost:4000}"
SECRET="${META_APP_SECRET:-local-dev-app-secret}"
LEADGEN_ID="${LEADGEN_ID:-lg_$(date +%s)_$RANDOM}"
NAME="${NAME:-Test Lead $RANDOM}"
EMAIL="${EMAIL:-lead.$RANDOM@example.com}"
PHONE="${PHONE:-+9198$(printf '%08d' $((RANDOM * RANDOM % 100000000)))}"
CITY="${CITY:-Bengaluru}"
NOW="$(date +%s)"

BODY=$(cat <<JSON
{"object":"page","entry":[{"id":"page_1","time":$NOW,"changes":[{"field":"leadgen","value":{"leadgen_id":"$LEADGEN_ID","page_id":"page_1","form_id":"form_coworking","ad_id":"ad_1","adgroup_id":"adset_1","campaign_id":"cmp_day_pass","created_time":$NOW,"field_data":[{"name":"full_name","values":["$NAME"]},{"name":"email","values":["$EMAIL"]},{"name":"phone_number","values":["$PHONE"]},{"name":"city","values":["$CITY"]}]}}]}]}
JSON
)

SIGNATURE="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')"

echo "→ POST $API_URL/webhook/meta-lead  (leadgen_id=$LEADGEN_ID)"
curl -sS -X POST "$API_URL/webhook/meta-lead" \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  --data-raw "$BODY"
echo
