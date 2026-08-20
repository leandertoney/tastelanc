#!/bin/bash

# OTA Deployment Script for All TasteLanc Apps
# Deploys to the PRODUCTION branch (required for production builds to receive updates).
#
# Each app deploys in parallel; each app's Android+iOS run sequentially inside its own
# job and the job's exit status is captured. The script reports a per-app PASS/FAIL
# summary and exits non-zero if ANY deploy failed — so a partial failure can never be
# reported as success (a real hazard: eas/expo errors have printed "success" before).

set -uo pipefail

# App dir (relative to repo root) → display name
APPS=(
  "apps/mobile:TasteLanc (Lancaster, PA)"
  "apps/mobile-cumberland:TasteCumberland (Cumberland County, PA)"
  "apps/mobile-fayetteville:TasteFayetteville (Fayetteville, NC)"
  # Ocean City is NOT deployable yet — apps/mobile-ocean-city/app.json still has
  # "projectId": "PLACEHOLDER_EAS_PROJECT_ID". Uncomment once a real EAS project
  # is configured, or every run will report this app as failed.
  # "apps/mobile-ocean-city:TasteOceanCity (Ocean City, MD)"
)

echo "======================================"
echo "  OTA Deployment to Production Branch"
echo "======================================"
echo ""
echo "This will deploy to ALL ${#APPS[@]} apps:"
for entry in "${APPS[@]}"; do
  echo "  - ${entry#*:}"
done
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled."
  exit 1
fi

echo ""
echo "Starting parallel deployments..."
echo ""

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATUS_DIR="$(mktemp -d)"
trap 'rm -rf "$STATUS_DIR"' EXIT

# Deploy one app: run Android then iOS sequentially, record the outcome to a status file.
deploy_app() {
  local dir="$1" name="$2" slug="$3"
  local rc=0
  (
    cd "$ROOT_DIR/$dir" || exit 1
    echo "[$name] Deploying Android..."
    eas update --auto --branch production --platform android || exit 1
    echo "[$name] Deploying iOS..."
    eas update --auto --branch production --platform ios || exit 1
  )
  rc=$?
  if [[ $rc -eq 0 ]]; then
    echo "PASS" > "$STATUS_DIR/$slug"
    echo "[$name] ✅ done"
  else
    echo "FAIL" > "$STATUS_DIR/$slug"
    echo "[$name] ❌ FAILED (exit $rc)"
  fi
}

# Launch all apps in parallel.
i=0
for entry in "${APPS[@]}"; do
  dir="${entry%%:*}"
  name="${entry#*:}"
  slug="app$i"
  deploy_app "$dir" "$name" "$slug" &
  i=$((i + 1))
done

# Wait for every background job.
wait

# Tally results.
echo ""
echo "======================================"
echo "  OTA Deployment Summary"
echo "======================================"
failures=0
i=0
for entry in "${APPS[@]}"; do
  name="${entry#*:}"
  slug="app$i"
  result="$(cat "$STATUS_DIR/$slug" 2>/dev/null || echo "UNKNOWN")"
  if [[ "$result" == "PASS" ]]; then
    echo "  ✅ $name"
  else
    echo "  ❌ $name ($result)"
    failures=$((failures + 1))
  fi
  i=$((i + 1))
done
echo ""

if [[ $failures -gt 0 ]]; then
  echo "⚠️  $failures app(s) FAILED to deploy. Re-run or investigate before assuming users are updated."
  exit 1
fi

echo "✅ All OTA Updates Deployed!"
echo ""
echo "Users will receive updates on next app launch."
echo "TestFlight users: Wait 2 minutes, then force close and reopen app."
echo ""
