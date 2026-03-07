---
name: deploy-mobile
description: Deploy OTA update to the correct mobile app (TasteLanc or TasteCumberland)
---

# Deploy Mobile App OTA Update

Deploy an over-the-air update to the specified mobile app.

**CRITICAL**: Confirm which app before deploying. These are SEPARATE apps with separate EAS projects.

## Steps

1. Ask which app to deploy: TasteLanc (`apps/mobile`) or TasteCumberland (`apps/mobile-cumberland`) if not specified in $ARGUMENTS
2. Verify you're in the correct directory
3. Check git status — ensure all changes are committed
4. Run the appropriate deployment command:
   - **TasteLanc**: `cd apps/mobile && eas update --branch production`
   - **TasteCumberland**: `cd apps/mobile-cumberland && eas update --branch production`
5. Verify the update was published successfully
6. Report the update ID and branch

## Safety Checks
- Never deploy both apps at once unless explicitly requested
- Always confirm the target app with the user
- Check that the EAS project slug matches the target app
