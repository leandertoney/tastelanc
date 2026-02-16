#!/bin/bash

# TasteLanc Environment Helper
# Shows current Supabase project link status

set -e

PROD_PROJECT_REF="kufcxxynjvyharhtfptd"

echo "TasteLanc Supabase Project: $PROD_PROJECT_REF"
echo ""
echo "Current linked project:"
npx supabase projects list 2>/dev/null | head -5 || echo "Run 'npx supabase login' first"
echo ""
echo "To link to production:"
echo "  npx supabase link --project-ref $PROD_PROJECT_REF"
