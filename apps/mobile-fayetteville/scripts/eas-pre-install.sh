#!/bin/bash
# EAS pre-install hook: removes apps/web from workspaces so npm ci skips it
# (apps/web pulls in netlify-cli → ipx → sharp, which fails to build on EAS iOS builders)

set -e

MONOREPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
echo "EAS pre-install: monorepo root = $MONOREPO_ROOT"

# Step 1: Rewrite root package.json workspaces without apps/web
node -e "
const fs = require('fs');
const path = require('path');
const pkgPath = path.join('$MONOREPO_ROOT', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.workspaces = [
  'apps/mobile',
  'apps/mobile-cumberland',
  'apps/mobile-fayetteville',
  'packages/mobile-shared',
  'packages/shared'
];
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('EAS pre-install: workspaces updated, apps/web excluded');
"

# Step 2: Regenerate lockfile so it no longer includes sharp (from apps/web → netlify-cli → ipx → sharp)
# npm ci will then install the clean lockfile without sharp.
echo "EAS pre-install: regenerating lockfile without apps/web dependencies..."
cd "$MONOREPO_ROOT"
npm install --package-lock-only --legacy-peer-deps
echo "EAS pre-install: lockfile regenerated — sharp excluded"
