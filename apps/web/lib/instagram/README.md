# Instagram Agent v1

Automated Instagram posting system for TasteLanc / TasteCumberland. Generates and publishes one post per day per market with zero manual intervention.

## Architecture

```
lib/instagram/
├── types.ts      # Shared TypeScript types
├── scoring.ts    # Candidate ranking & selection logic
├── prompts.ts    # Caption generation prompt templates
├── media.ts      # Media selection & recency tracking
├── generate.ts   # Post generation orchestrator
├── publish.ts    # Instagram Graph API publishing
└── README.md     # This file

app/api/instagram/
├── generate/     # POST - Generate a draft post
├── publish/      # POST - Publish a draft to Instagram
├── refresh-token/# POST - Refresh expiring tokens
├── metrics/      # POST - Collect post engagement metrics
└── cron/         # POST - Combined generate+publish (pg_cron entry point)

app/instagram/
└── page.tsx      # Landing page for Instagram bio link (UTM-aware)

supabase/migrations/
└── 20260306_instagram_agent.sql  # DB tables + pg_cron schedules
```

## Database Tables

| Table | Purpose |
|-------|---------|
| `instagram_accounts` | Meta/Instagram credentials per market |
| `instagram_posts` | Generated + published posts (one per market per day) |
| `instagram_post_memory` | Recency tracking to prevent overuse |
| `instagram_generation_logs` | Audit trail for every generation run |

## Content Types

1. **Tonight/Today** — Happy hours, events, specials happening today
2. **Weekend Preview** — Thu/Fri posts previewing the weekend
3. **Category Roundup** — Evergreen fallback ("Best pizza in Lancaster")

Decision flow: Tonight/Today → Weekend Preview → Category Roundup (guaranteed fallback)

## Scoring Formula

```
score = (tier_weight × 3) + (freshness × 2) + (photo_quality × 2) + (rating_weight × 1.5) - recency_penalty
```

| Factor | Values |
|--------|--------|
| Tier weight | Elite=4, Premium=3, Basic/Coffee=2, Free=1 |
| Freshness | ≤3 days=3, ≤7 days=2, ≤30 days=1, older=0 |
| Photo quality | Own image=2, Cover image=1, None=0 |
| Rating | ≥4.5=2, ≥4.0=1.5, ≥3.5=1, lower=0.5 |
| Recency penalty | 0–6 based on days since last used + overuse in 30d |

## Environment Variables Required

Add these to `apps/web/.env.local`:

```bash
# Instagram / Meta Graph API (required for publishing)
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret

# Already configured:
# OPENAI_API_KEY (used for caption generation via gpt-4o-mini)
# CRON_SECRET (used for pg_cron auth)
# NEXT_PUBLIC_SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
```

## Connecting the First Instagram Business Account

### Prerequisites
1. An Instagram Business or Creator account (not personal)
2. A Facebook Page linked to that Instagram account
3. A Meta Developer App with `instagram_basic`, `instagram_content_publish`, `pages_read_engagement` permissions

### Steps

1. **Create a Meta App** at [developers.facebook.com](https://developers.facebook.com)
   - Type: Business
   - Add "Instagram Graph API" product
   - Add permissions: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`

2. **Get a User Access Token** via the Graph API Explorer:
   - Select your app
   - Select permissions: `pages_show_list`, `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`
   - Generate token
   - Click "Get Long-Lived Token" (valid 60 days, auto-refreshed by the system)

3. **Find your Instagram Business Account ID:**
   ```bash
   curl "https://graph.facebook.com/v19.0/me/accounts?access_token=YOUR_TOKEN"
   # Get the page ID from the response

   curl "https://graph.facebook.com/v19.0/PAGE_ID?fields=instagram_business_account&access_token=YOUR_TOKEN"
   # Get the instagram_business_account.id
   ```

4. **Insert the account record:**
   ```sql
   INSERT INTO instagram_accounts (
     market_id,
     instagram_business_account_id,
     facebook_page_id,
     access_token_encrypted,
     token_expires_at,
     post_time,
     timezone
   ) VALUES (
     (SELECT id FROM markets WHERE slug = 'lancaster-pa'),
     'YOUR_IG_BUSINESS_ACCOUNT_ID',
     'YOUR_FACEBOOK_PAGE_ID',
     'YOUR_LONG_LIVED_TOKEN',
     NOW() + INTERVAL '60 days',
     '11:30:00',
     'America/New_York'
   );
   ```

5. **Add env vars** to `.env.local`:
   ```
   META_APP_ID=your_app_id
   META_APP_SECRET=your_app_secret
   ```

6. **Run the migration:**
   ```bash
   SUPABASE_DB_PASSWORD='LTMackin!23' npx supabase db push
   ```

7. **Test generation** (without publishing):
   ```bash
   curl -X POST http://localhost:3000/api/instagram/generate \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"market_slug": "lancaster-pa"}'
   ```

8. **Test full cron flow:**
   ```bash
   curl -X POST http://localhost:3000/api/instagram/cron \
     -H "Authorization: Bearer YOUR_CRON_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"market_slug": "lancaster-pa"}'
   ```

## Cron Schedule (pg_cron)

| Job | Schedule (UTC) | Local Time (EDT) |
|-----|---------------|-------------------|
| Lancaster post | 15:30 daily | 11:30 AM |
| Cumberland post | 15:35 daily | 11:35 AM |
| Token refresh | 04:00 daily | 12:00 AM |
| Metrics sync | 05:00 daily | 1:00 AM |

## Instagram Bio Link

Set your Instagram bio link to:
```
https://tastelanc.com/instagram?utm_source=instagram&utm_medium=social&utm_campaign=bio
```

This landing page:
- Shows app download CTAs
- Preserves UTM parameters for install attribution
- Works for both App Store and Google Play

## Future Enhancements (not built yet)
- Carousel support (code is structured for it)
- Token encryption at rest (currently plaintext in DB)
- Admin UI for reviewing/editing drafts before publish
- Reels workflow
- Comment engagement automation
