---
name: cross-app-refactor
description: Safely refactor code across multiple apps in the monorepo
---

# Cross-App Refactor

Perform a refactor that spans multiple apps while maintaining consistency.

## Before Starting

1. Run `git status` to ensure clean working directory
2. Identify ALL files that need changes across apps/web, apps/mobile, apps/mobile-cumberland, and packages/shared

## Refactor Process

1. **Start with shared packages**: If the refactor involves shared types or utilities, update `packages/shared/` first
2. **Update web app**: Apply changes to `apps/web/`
3. **Update TasteLanc mobile**: Apply changes to `apps/mobile/`
4. **Update TasteCumberland mobile**: Apply changes to `apps/mobile-cumberland/`
5. **Verify types**: Run `npx tsc --noEmit` in each affected app

## Safety Rules

- NEVER change mobile app bundle IDs, EAS project IDs, or app slugs
- NEVER modify .env files directly
- If a shared type changes, update ALL consumers before committing
- Run type checks after EVERY app is updated, not just at the end

## After Refactoring

1. Run type checks in all apps
2. Verify no import errors
3. Create a single commit with all changes (atomic refactor)
