-- Instagram Agent v1: Automated Instagram posting system
-- Tables: instagram_accounts, instagram_posts, instagram_post_memory, instagram_generation_logs

-- ============================================
-- instagram_accounts: Meta/Instagram credentials per market
-- ============================================
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.markets(id),
  instagram_business_account_id TEXT NOT NULL,
  facebook_page_id TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  post_time TIME NOT NULL DEFAULT '11:30:00',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(market_id)
);

-- ============================================
-- instagram_posts: Generated + published posts
-- ============================================
CREATE TABLE IF NOT EXISTS public.instagram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.markets(id),
  post_date DATE NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('tonight_today', 'weekend_preview', 'category_roundup')),
  selected_entity_ids JSONB NOT NULL DEFAULT '[]',
  caption TEXT NOT NULL,
  media_urls JSONB NOT NULL DEFAULT '[]',
  instagram_media_id TEXT,
  instagram_permalink TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'failed')),
  generation_metadata JSONB DEFAULT '{}',
  engagement_metrics JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  published_at TIMESTAMPTZ,
  UNIQUE(market_id, post_date)
);

-- ============================================
-- instagram_post_memory: Recency tracking
-- ============================================
CREATE TABLE IF NOT EXISTS public.instagram_post_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.markets(id),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  asset_url TEXT,
  content_type TEXT NOT NULL,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  use_count_30d INTEGER NOT NULL DEFAULT 1,
  use_count_90d INTEGER NOT NULL DEFAULT 1
);

-- Index for fast recency lookups
CREATE INDEX idx_ig_memory_market_restaurant ON public.instagram_post_memory(market_id, restaurant_id);
CREATE INDEX idx_ig_memory_market_asset ON public.instagram_post_memory(market_id, asset_url);

-- ============================================
-- instagram_generation_logs: Audit trail
-- ============================================
CREATE TABLE IF NOT EXISTS public.instagram_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.markets(id),
  run_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  decision_path TEXT NOT NULL,
  candidate_summary JSONB DEFAULT '{}',
  selected_post_type TEXT,
  selected_ids JSONB DEFAULT '[]',
  model_used TEXT,
  token_usage JSONB DEFAULT '{}',
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT
);

-- Index for log queries
CREATE INDEX idx_ig_logs_market_date ON public.instagram_generation_logs(market_id, run_at DESC);
CREATE INDEX idx_ig_posts_market_date ON public.instagram_posts(market_id, post_date DESC);
CREATE INDEX idx_ig_posts_status ON public.instagram_posts(status);

-- Enable RLS (service role only, no user-facing access)
ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_post_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instagram_generation_logs ENABLE ROW LEVEL SECURITY;

-- pg_cron schedule for daily Instagram post generation + publish
-- Runs at 3:30 PM UTC = 11:30 AM EDT (Lancaster default)
SELECT cron.schedule(
  'instagram-daily-lancaster',
  '30 15 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.site_url') || '/api/instagram/cron',
    body := '{"market_slug": "lancaster-pa", "source": "pg_cron"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret')
    )
  )$$
);

-- Cumberland cron offset by 5 minutes
SELECT cron.schedule(
  'instagram-daily-cumberland',
  '35 15 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.site_url') || '/api/instagram/cron',
    body := '{"market_slug": "cumberland-pa", "source": "pg_cron"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret')
    )
  )$$
);

-- Token refresh cron: daily at 4 AM UTC
SELECT cron.schedule(
  'instagram-token-refresh',
  '0 4 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.site_url') || '/api/instagram/refresh-token',
    body := '{"source": "pg_cron"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret')
    )
  )$$
);

-- Metrics collection cron: daily at 5 AM UTC (collects yesterday's engagement)
SELECT cron.schedule(
  'instagram-metrics-sync',
  '0 5 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.site_url') || '/api/instagram/metrics',
    body := '{"source": "pg_cron"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret')
    )
  )$$
);
