-- Fix Instagram cron schedules: use America/New_York timezone
-- and split into generate (early AM) + publish (at post time)

-- Remove old cron jobs
SELECT cron.unschedule('instagram-daily-lancaster');
SELECT cron.unschedule('instagram-daily-cumberland');
SELECT cron.unschedule('instagram-evening-lancaster');
SELECT cron.unschedule('instagram-evening-cumberland');

-- Add status 'approved' to track review workflow
ALTER TABLE public.instagram_posts DROP CONSTRAINT IF EXISTS instagram_posts_status_check;
ALTER TABLE public.instagram_posts ADD CONSTRAINT instagram_posts_status_check
  CHECK (status IN ('draft', 'approved', 'published', 'failed'));

-- ============================================
-- GENERATE crons: create drafts at 6:00 AM ET
-- Times converted: 6:00 AM EDT = 10:00 UTC, 6:00 AM EST = 11:00 UTC
-- Using 11:00 UTC (6 AM EST / 7 AM EDT) to ensure we never miss
-- ============================================

-- Lancaster AM post (happy hours/specials)
SELECT cron.schedule(
  'instagram-generate-am-lancaster',
  '0 11 * * *',
  $$SELECT net.http_post(
    url := 'https://tastelanc.com/api/instagram/cron',
    body := '{"market_slug": "lancaster-pa", "source": "pg_cron", "force_type": "tonight_today", "post_slot": "am", "preview_only": true}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 9e98786de33d85396badebb998129d54f879970287be03f1ed5704a8663e6912'
    )
  )$$
);

-- Lancaster PM post (events)
SELECT cron.schedule(
  'instagram-generate-pm-lancaster',
  '5 11 * * *',
  $$SELECT net.http_post(
    url := 'https://tastelanc.com/api/instagram/cron',
    body := '{"market_slug": "lancaster-pa", "source": "pg_cron", "force_type": "upcoming_events", "post_slot": "pm", "preview_only": true}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 9e98786de33d85396badebb998129d54f879970287be03f1ed5704a8663e6912'
    )
  )$$
);

-- Cumberland: no Instagram account configured yet — add crons when ready

-- ============================================
-- PUBLISH crons: publish approved posts
-- 11:30 AM EST = 16:30 UTC
-- 5:30 PM EST = 22:30 UTC
-- ============================================

-- Lancaster AM publish at 16:30 UTC (11:30 AM EST)
SELECT cron.schedule(
  'instagram-publish-am-lancaster',
  '30 16 * * *',
  $$SELECT net.http_post(
    url := 'https://tastelanc.com/api/instagram/publish-approved',
    body := '{"market_slug": "lancaster-pa", "post_slot": "am", "source": "pg_cron"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 9e98786de33d85396badebb998129d54f879970287be03f1ed5704a8663e6912'
    )
  )$$
);

-- Lancaster PM publish at 22:30 UTC (5:30 PM EST)
SELECT cron.schedule(
  'instagram-publish-pm-lancaster',
  '30 22 * * *',
  $$SELECT net.http_post(
    url := 'https://tastelanc.com/api/instagram/publish-approved',
    body := '{"market_slug": "lancaster-pa", "post_slot": "pm", "source": "pg_cron"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 9e98786de33d85396badebb998129d54f879970287be03f1ed5704a8663e6912'
    )
  )$$
);

-- Cumberland: no Instagram account configured yet — add publish crons when ready
