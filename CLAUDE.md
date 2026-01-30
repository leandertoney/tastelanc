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
