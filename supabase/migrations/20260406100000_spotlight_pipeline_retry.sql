-- Spotlight Pipeline: retry tracking + abandoned status + pg_cron schedule
-- Sat = Elite spotlight, Sun = Premium spotlight (8 AM ET = 13:00 UTC)

-- ============================================================================
-- 1. Add retry tracking columns to instagram_posts
-- ============================================================================
ALTER TABLE public.instagram_posts
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retry_log JSONB NOT NULL DEFAULT '[]';

-- ============================================================================
-- 2. Rebuild status constraint to include 'abandoned'
-- The previous constraint was rebuilt multiple times — drop and recreate cleanly.
-- ============================================================================
ALTER TABLE public.instagram_posts
  DROP CONSTRAINT IF EXISTS instagram_posts_status_check;

ALTER TABLE public.instagram_posts
  ADD CONSTRAINT instagram_posts_status_check
  CHECK (status IN (
    'draft',
    'pending_review',
    'approved',
    'rejected',
    'published',
    'failed',
    'abandoned'
  ));

-- ============================================================================
-- 3. Index for abandoned posts (summary report queries)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_ig_posts_abandoned
  ON public.instagram_posts (market_id, post_date DESC)
  WHERE status = 'abandoned';

-- ============================================================================
-- 4. pg_cron: Spotlight generation jobs
-- Saturday 8:00 AM ET (13:00 UTC) → Elite spotlight
-- Sunday  8:00 AM ET (13:00 UTC) → Premium spotlight
-- Using the same CRON_SECRET as all other instagram cron jobs.
-- ============================================================================

-- Clean up if already exists (idempotent)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN (
  'instagram-spotlight-elite-lancaster',
  'instagram-spotlight-premium-lancaster'
);

-- Saturday: Elite spotlight for Lancaster
SELECT cron.schedule(
  'instagram-spotlight-elite-lancaster',
  '0 13 * * 6',
  $$SELECT net.http_post(
    url := 'https://tastelanc.com/api/instagram/spotlight/cron',
    body := '{"market_slug": "lancaster-pa", "tier": "elite", "source": "pg_cron"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 9e98786de33d85396badebb998129d54f879970287be03f1ed5704a8663e6912'
    )
  )$$
);

-- Sunday: Premium spotlight for Lancaster
SELECT cron.schedule(
  'instagram-spotlight-premium-lancaster',
  '0 13 * * 0',
  $$SELECT net.http_post(
    url := 'https://tastelanc.com/api/instagram/spotlight/cron',
    body := '{"market_slug": "lancaster-pa", "tier": "premium", "source": "pg_cron"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 9e98786de33d85396badebb998129d54f879970287be03f1ed5704a8663e6912'
    )
  )$$
);
