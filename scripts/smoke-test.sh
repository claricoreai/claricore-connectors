#!/usr/bin/env bash
set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for scripts/smoke-test.sh"
  exit 1
fi

API_URL="${API_URL:-http://localhost:4000}"
WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:4100}"

echo "[1/4] health checks"
curl -fsS "$API_URL/health" | jq .
curl -fsS "$WEBHOOK_URL/health" | jq .

echo "[2/4] create connection"
CONNECTION_ID=$(curl -fsS -X POST "$API_URL/connections" \
  -H 'content-type: application/json' \
  -d '{"connectorType":"salesforce","name":"Smoke","syncMode":"incremental","credentials":{"token":"dev"}}' | jq -r '.data.id')

echo "[3/4] trigger sync"
JOB_ID=$(curl -fsS -X POST "$API_URL/connections/$CONNECTION_ID/sync" \
  -H 'content-type: application/json' \
  -d '{"mode":"incremental"}' | jq -r '.data.id')

echo "[4/4] fetch job"
curl -fsS "$API_URL/jobs/$JOB_ID" | jq .

echo "Smoke test completed"
