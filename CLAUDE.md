# Claude Code Project Context

This file contains important context for AI coding assistants working on the TasteLanc project.

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

- `apps/web/` - Next.js web application
- `apps/mobile/` - React Native mobile application
- `packages/shared/` - Shared types and constants
- `supabase/` - Supabase migrations and config

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
