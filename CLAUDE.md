# Claude Code Project Context

This file contains important context for AI coding assistants working on the TasteLanc project.

## Git Workflow Rules (MANDATORY)

**COMMIT but DO NOT PUSH unless the user explicitly says "push" or "push to main".**

- When asked to "commit", create the commit locally only — never push
- When asked to "commit and push", then push
- This allows multiple agents to work in parallel without triggering redundant deploys
- The user will push manually or ask one agent to push all accumulated commits

## Domain Isolation (MANDATORY)

At the start of every task, identify which domain the task falls into and declare it. Then **strictly** stay within that domain for the entire conversation.

**Domains and their file boundaries:**

| Domain | Directories | Description |
|---|---|---|
| Mobile Apps | `apps/mobile/`, `apps/mobile-cumberland/`, `apps/mobile-fayetteville/`, `packages/mobile-shared/` | All three mobile apps and shared mobile code |
| Dashboard & CRM | `apps/web/app/(sales)/`, `apps/web/app/(dashboard)/`, `apps/web/app/api/sales/`, `apps/web/app/api/dashboard/`, `apps/web/config/commission.ts` | Sales CRM, restaurant dashboard, commissions |
| Admin Panel | `apps/web/app/(admin)/`, `apps/web/app/api/admin/` | Admin-only pages and routes |
| Backend / Infra | `supabase/`, `apps/web/lib/notifications/`, `apps/web/netlify/` | Migrations, edge functions, cron jobs, notifications |
| New Features | New directories only (e.g., `apps/web/app/(game)/`) | Greenfield work that doesn't touch existing code |
| Shared / Auth | `apps/web/lib/auth/`, `apps/web/contexts/`, `packages/shared/` | Shared utilities, auth, contexts — **only one agent at a time** |

**Rules:**
1. At the start of your task, state: "This task is in the **[Domain]** domain. I will only modify files in [directories]."
2. If the task requires files outside your domain, **STOP and tell the user** — do not silently cross boundaries
3. If the user's request spans multiple domains, ask them to split it into separate tasks
4. **Shared / Auth is a protected domain** — never modify these files as a side effect of another domain's task without explicit user approval

## Database & Credentials

**IMPORTANT: Before asking for database passwords or credentials, check here first!**

### Supabase Configuration
- **Project URL:** `https://kufcxxynjvyharhtfptd.supabase.co`
- **Project Reference:** `kufcxxynjvyharhtfptd`
- **Database Password:** `LTMackin!23`

### Environment Variables Location
- Web app: `apps/web/.env.local`
- Mobile app: `apps/mobile/.env`

### Running Supabase Migrations
```bash
# Set the password and push migrations
SUPABASE_DB_PASSWORD='LTMackin!23' npx supabase db push

# Or link the project first (if not already linked)
npx supabase link --project-ref kufcxxynjvyharhtfptd
```

## Project Structure

- `apps/web/` - Next.js web application (shared, multi-market)
- `apps/mobile/` - **TasteLanc** React Native mobile app (Lancaster, PA)
- `apps/mobile-cumberland/` - **TasteCumberland** React Native mobile app (Cumberland County, PA)
- `packages/shared/` - Shared types and constants
- `supabase/` - Supabase migrations and config

## CRITICAL: Two Separate Mobile Apps

**These are COMPLETELY SEPARATE apps with separate EAS projects, bundle IDs, and TestFlight listings. NEVER confuse them.**

| | TasteLanc | TasteCumberland |
|---|---|---|
| **Directory** | `apps/mobile/` | `apps/mobile-cumberland/` |
| **EAS Slug** | `tastelanc` | `taste-cumberland` |
| **EAS Project ID** | `18a9e6d1-1240-4875-b38f-67edc5b50bdd` | `0e0abbe1-3518-4669-bb7a-46a1d0d63b68` |
| **Bundle ID** | `com.tastelanc.app` | `com.tastelanc.cumberland` |
| **ASC App ID** | `6755852717` | `6759233248` |
| **Market** | Lancaster, PA | Cumberland County, PA |

**When the user says "TasteCumberland" or "the Cumberland app", work ONLY in `apps/mobile-cumberland/`.**
**When the user says "TasteLanc", work ONLY in `apps/mobile/`.**
**NEVER push OTA updates or builds to one app when working on the other.**

## CRITICAL: Market Isolation — MANDATORY for ALL Data Operations

**Every database query, push notification, and user-facing data operation MUST be scoped to a specific market. Sending cross-market data to users is a critical bug that damages user trust.**

### Market ↔ App Mapping
| Market Slug | App Slug | Push Token Filter |
|---|---|---|
| `lancaster-pa` | `tastelanc` | `.eq('app_slug', 'tastelanc')` |
| `cumberland-pa` | `taste-cumberland` | `.eq('app_slug', 'taste-cumberland')` |
| `fayetteville-nc` | `taste-fayetteville` | `.eq('app_slug', 'taste-fayetteville')` |

### Rules
1. **Push notifications**: Query data with `market_id` filter AND send only to that market's `app_slug` tokens
2. **Cron jobs / scheduled functions**: MUST iterate over each market independently — never query all markets then send one notification
3. **Database queries**: `restaurants`, `happy_hours`, `events`, `specials`, `checkins`, `restaurant_hours` queries MUST filter by `market_id`. Child tables without `market_id` column MUST use `restaurants!inner` join: `.select('*, restaurant:restaurants!inner(market_id)').eq('restaurant.market_id', marketId)`
4. **New notification types**: Use the `sendTodaysPickForMarket` / `sendHappyHourAlertsForMarket` per-market pattern
5. **Runtime guard**: Use `validateMarketScope()` from `apps/web/lib/notifications/market-guard.ts` before sending any push notification
6. **Audit script**: Run `npx tsx scripts/audit-notifications.ts` to verify all notification code is market-scoped
7. **NEVER write a `.from()` query on a restaurant-child table without market scoping** — if the table doesn't have `market_id`, join through restaurants

### New Market Launch Checklist (MANDATORY)
Before declaring any new market app "ready", ALL of the following must be verified:
1. **Restaurant categorization**: Run `cd apps/web && npx tsx scripts/categorize-restaurants.ts --market=<slug> --uncategorized-only` — zero uncategorized restaurants
2. **Every feature works**: Open each screen (Home, Explore, Plan Your Day, Happy Hours, Events, Specials, Profile) and verify data appears
3. **Market isolation**: No data from other markets visible anywhere
4. **All queries scoped**: Search the codebase for any new `.from()` calls on child tables and verify market filtering
5. **Assets complete**: AI avatar, animated logo, splash video, onboarding hero — no placeholders from other apps
6. **Push notifications**: Capability enabled on Apple Developer Portal, provisioning profile includes push

### Reference Files
- Edge function: `supabase/functions/send-notifications/index.ts` (MARKET_INFO mapping)
- Netlify function: `apps/web/netlify/functions/happy-hour-alerts.ts` (MARKET_APP_SLUG mapping)
- Runtime guard: `apps/web/lib/notifications/market-guard.ts`

## Deployment

**IMPORTANT: This project uses Netlify for web application deployment, NOT Vercel.**

- **Web App (apps/web):** Deployed on Netlify
- **TasteLanc Mobile (apps/mobile):** EAS project `tastelanc` — OTA: `cd apps/mobile && eas update --branch production`
- **TasteCumberland Mobile (apps/mobile-cumberland):** EAS project `taste-cumberland` — OTA: `cd apps/mobile-cumberland && eas update --branch production`

When discussing deployment or making deployment-related changes:
- Web changes are deployed via Netlify's automatic Git integration
- Mobile changes must target the CORRECT app directory — always confirm which app before deploying
- Never assume or mention Vercel - it has never been used for this project

## Common Scripts

### Restaurant Categorization
```bash
# Google Places sync (run from apps/mobile)
cd apps/mobile
SUPABASE_URL=https://kufcxxynjvyharhtfptd.supabase.co \
SUPABASE_SERVICE_KEY=<service_role_key> \
GOOGLE_API_KEY=<google_api_key> \
node scripts/sync_google_places.js

# Claude AI categorization (run from apps/web)
cd apps/web
npx tsx scripts/categorize-restaurants.ts
```

## API Keys

**Note:** These are used in various scripts. Check `apps/web/.env.local` for the full list.

- **Google API Key:** `AIzaSyA2pfw7scIrffb_O_o1Jvj7iimp2Pg3jZE`
- **Supabase Service Role Key:** In `apps/web/.env.local` as `SUPABASE_SERVICE_ROLE_KEY`
- **Anthropic API Key:** In `apps/web/.env.local` as `ANTHROPIC_API_KEY`

## Supabase Migration Note

When running `npx supabase db push`, use this connection string format:
```bash
npx supabase db push --db-url "postgresql://postgres.kufcxxynjvyharhtfptd:LTMackin%2123@aws-0-us-west-2.pooler.supabase.com:5432/postgres"
```

Note: The `!` in the password must be URL-encoded as `%21`.

## API Route Patterns & Best Practices

### Testing Requirements

**CRITICAL: Before presenting any feature as complete, you MUST test it end-to-end yourself.**

Test-Driven Development Standards:
- Test ALL CRUD operations (Create, Read, Update, Delete), not just one
- Test with both regular restaurant owner accounts AND admin mode
- Test edge cases (max limits, validation errors, access denied scenarios)
- Test the entire user flow from start to finish
- Never present a feature as complete until YOU have verified it works

**Do not rely on the user for QA testing of basic functionality.**

### Row Level Security (RLS) Requirements

**CRITICAL: When creating API routes that modify database tables with RLS policies, you MUST use the service role client for write operations.**

Common tables with RLS policies:
- `restaurant_photos`
- `restaurants`
- `happy_hours`
- `specials`
- `events`
- `menus`

#### Correct Pattern for API Routes:

```typescript
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { verifyRestaurantAccess } from '@/lib/auth/restaurant-access';

export async function POST(request: Request) {
  // 1. Use regular client for authentication & authorization
  const supabase = await createClient();

  // IMPORTANT: Always use verifyRestaurantAccess() - it handles both:
  // - Regular restaurant owners
  // - Admin mode (when admin is editing another restaurant's data)
  const accessResult = await verifyRestaurantAccess(supabase, restaurantId);

  if (!accessResult.canAccess) {
    return NextResponse.json(
      { error: accessResult.error || 'Access denied' },
      { status: accessResult.userId ? 403 : 401 }
    );
  }

  // 2. Use service role client for ALL database write operations
  const serviceClient = createServiceRoleClient();

  // INSERT example
  const { data, error } = await serviceClient
    .from('restaurant_photos')
    .insert({ ... });

  // UPDATE example
  const { error: updateError } = await serviceClient
    .from('restaurant_photos')
    .update({ ... });

  // DELETE example
  const { error: deleteError } = await serviceClient
    .from('restaurant_photos')
    .delete();
}
```

#### Why This Is Required:

Supabase Row Level Security policies restrict database operations based on the authenticated user. Even when a user has valid access (verified via `verifyRestaurantAccess`), the RLS policies may still block the operation because they check `auth.uid()` which doesn't match service operations.

**Solution**: After verifying access with the regular client, use `createServiceRoleClient()` for all write operations (INSERT, UPDATE, DELETE) to bypass RLS policies.

#### Common Error:

```
Error: new row violates row-level security policy for table "restaurant_photos"
```

This means you're using the regular client (`createClient()`) for a write operation instead of the service role client (`createServiceRoleClient()`).

### Existing API Routes Using This Pattern:

Reference these for examples:
- `apps/web/app/api/dashboard/photos/upload/route.ts`
- `apps/web/app/api/dashboard/photos/[id]/route.ts`
- `apps/web/app/api/dashboard/photos/[id]/cover/route.ts`
- `apps/web/app/api/dashboard/specials/upload/route.ts`
- `apps/web/app/api/dashboard/happy-hours/upload/route.ts`
