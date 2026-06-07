#!/bin/bash

# OTA Deployment Script for All TasteLanc Apps
# Deploys to the PRODUCTION branch (required for production builds to receive updates)

set -e  # Exit on error

echo "======================================"
echo "  OTA Deployment to Production Branch"
echo "======================================"
echo ""
echo "This will deploy to ALL 3 apps:"
echo "  - TasteLanc (Lancaster, PA)"
echo "  - TasteCumberland (Cumberland County, PA)"
echo "  - TasteFayetteville (Fayetteville, NC)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Deployment cancelled."
    exit 1
fi

echo ""
echo "Starting parallel deployments..."
echo ""

# Get the root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Deploy TasteLanc
(
  cd "$ROOT_DIR/apps/mobile"
  echo "[TasteLanc] Deploying Android..."
  eas update --auto --branch production --platform android
  echo "[TasteLanc] Deploying iOS..."
  eas update --auto --branch production --platform ios
) &

# Deploy TasteCumberland
(
  cd "$ROOT_DIR/apps/mobile-cumberland"
  echo "[TasteCumberland] Deploying Android..."
  eas update --auto --branch production --platform android
  echo "[TasteCumberland] Deploying iOS..."
  eas update --auto --branch production --platform ios
) &

# Deploy TasteFayetteville
(
  cd "$ROOT_DIR/apps/mobile-fayetteville"
  echo "[TasteFayetteville] Deploying Android..."
  eas update --auto --branch production --platform android
  echo "[TasteFayetteville] Deploying iOS..."
  eas update --auto --branch production --platform ios
) &

# Wait for all deployments to complete
wait

echo ""
echo "======================================"
echo "  ✅ All OTA Updates Deployed!"
echo "======================================"
echo ""
echo "Users will receive updates on next app launch."
echo "TestFlight users: Wait 2 minutes, then force close and reopen app."
echo ""
