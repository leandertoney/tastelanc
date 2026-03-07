---
name: test-all
description: Run tests and type checks across all apps in the monorepo
---

# Run All Tests

Run the full test suite across every app and package in the monorepo.

## Steps

1. **Shared packages first** (dependencies of other apps):
   ```bash
   cd packages/shared && npm run build 2>&1 || echo "SHARED BUILD FAILED"
   ```

2. **Web app tests and type check**:
   ```bash
   cd apps/web && npm run typecheck 2>&1 || echo "WEB TYPECHECK FAILED"
   cd apps/web && npm run lint 2>&1 || echo "WEB LINT FAILED"
   cd apps/web && npm run build 2>&1 || echo "WEB BUILD FAILED"
   ```

3. **Mobile app type checks** (TasteLanc):
   ```bash
   cd apps/mobile && npx tsc --noEmit 2>&1 || echo "MOBILE TYPECHECK FAILED"
   ```

4. **Mobile app type checks** (TasteCumberland):
   ```bash
   cd apps/mobile-cumberland && npx tsc --noEmit 2>&1 || echo "CUMBERLAND TYPECHECK FAILED"
   ```

5. **Report results**: Summarize pass/fail for each app

## Notes
- Run each check independently so one failure doesn't block others
- Report ALL failures, not just the first one
- If $ARGUMENTS contains a specific app name, only test that app
