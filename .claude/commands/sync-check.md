---
name: sync-check
description: Check that shared types and constants are in sync across all apps
---

# Cross-App Sync Check

Verify that shared types, constants, and patterns are consistent across all apps.

## Steps

1. **Check shared package exports**: Read `packages/shared/src/index.ts` and verify all exports are used
2. **Check for duplicate types**: Search for type definitions that exist in both app-specific code and shared package
3. **Check Supabase types**: Verify database types are consistent between web and mobile apps
4. **Check environment variables**: Compare `.env` files across apps to ensure shared variables match
5. **Check package versions**: Verify shared dependencies (React, Supabase, etc.) are on compatible versions across all apps

## What to Look For
- Types defined in `apps/web/` that should be in `packages/shared/`
- Supabase client configurations that differ between apps
- API URL or key mismatches between apps
- Shared component patterns that have drifted between mobile apps

## Report Format
For each issue found:
- File path and line number
- What's inconsistent
- Recommended fix
