#!/bin/bash

# TasteLanc Environment Switcher
# Usage: ./scripts/switch-env.sh [dev|prod]

set -e

DEV_PROJECT_REF="kcoszrcubshtsezcktnn"
PROD_PROJECT_REF="kufcxxynjvyharhtfptd"

if [ -z "$1" ]; then
    echo "Usage: ./scripts/switch-env.sh [dev|prod]"
    echo ""
    echo "Current linked project:"
    npx supabase projects list 2>/dev/null | head -5 || echo "Run 'npx supabase login' first"
    exit 1
fi

case "$1" in
    dev|development)
        echo "Switching to DEVELOPMENT environment..."
        npx supabase link --project-ref "$DEV_PROJECT_REF"
        echo "✓ Now linked to Development: $DEV_PROJECT_REF"
        ;;
    prod|production)
        echo "Switching to PRODUCTION environment..."
        echo "⚠️  WARNING: You are switching to PRODUCTION!"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npx supabase link --project-ref "$PROD_PROJECT_REF"
            echo "✓ Now linked to Production: $PROD_PROJECT_REF"
        else
            echo "Cancelled."
            exit 0
        fi
        ;;
    *)
        echo "Unknown environment: $1"
        echo "Usage: ./scripts/switch-env.sh [dev|prod]"
        exit 1
        ;;
esac
