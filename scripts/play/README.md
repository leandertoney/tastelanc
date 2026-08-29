# Play subscriptions for the Taste apps

Read-only listing (safe any time):
    python3 scripts/play/play_api.py

Create the three subscriptions as DRAFTS, mirroring iOS ids and US prices ($4.99 mo, $14.99 intro annual, $24.99 annual):
    python3 scripts/play/play_create.py com.tastelanc.app        apps/mobile/google-service-account.json            TasteLanc
    python3 scripts/play/play_create.py com.tastelanc.cumberland apps/mobile-cumberland/google-service-account.json TasteCumberland

Activate the base plans (makes them purchasable):
    python3 scripts/play/play_activate.py com.tastelanc.app        apps/mobile/google-service-account.json
    python3 scripts/play/play_activate.py com.tastelanc.cumberland apps/mobile-cumberland/google-service-account.json

Then in RevenueCat (project TasteLanc): Products > "TasteLanc (Play Store)" > Import, attach each to the `premium`
entitlement, and add the Play products to the same offering packages as iOS (monthly / annual).
