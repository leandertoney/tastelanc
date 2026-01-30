-- Add scheduling support to blog_posts table
-- This enables pre-generation of posts the night before and reliable publishing

-- Add status column for draft/scheduled/published workflow
ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';

-- Add scheduled_publish_at for when the post should go live
ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz;

-- Add published_at for when the post actually went live
ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Add generation_error to track pre-generation failures
ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS generation_error text;

-- Index for efficient queries on scheduled posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_scheduled
ON public.blog_posts (status, scheduled_publish_at)
WHERE status = 'scheduled';

-- Update existing posts to have published_at = created_at
UPDATE public.blog_posts
SET published_at = created_at,
    status = 'published'
WHERE published_at IS NULL;

-- Create table to track blog generation failures for notifications
CREATE TABLE IF NOT EXISTS public.blog_generation_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_for timestamptz NOT NULL,
  error_message text NOT NULL,
  notified_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Enable pg_cron and pg_net extensions for scheduled HTTP calls
-- Note: These may already be enabled in your Supabase project
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to call the pre-generation API
CREATE OR REPLACE FUNCTION public.trigger_blog_pregeneration()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  api_url text;
BEGIN
  -- Get the site URL from app settings or use default
  api_url := 'https://tastelanc.com/api/blog/pregenerate';

  -- Make HTTP request to pre-generation endpoint
  PERFORM net.http_post(
    url := api_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
    ),
    body := jsonb_build_object('source', 'pg_cron')
  );
END;
$$;

-- Function to call the publishing API
CREATE OR REPLACE FUNCTION public.trigger_blog_publish()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_url text;
BEGIN
  api_url := 'https://tastelanc.com/api/blog/publish-scheduled';

  PERFORM net.http_post(
    url := api_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
    ),
    body := jsonb_build_object('source', 'pg_cron')
  );
END;
$$;

-- Schedule pre-generation: Sunday, Tuesday, Thursday at 10 PM EST (3 AM UTC next day)
-- This generates posts for Monday, Wednesday, Friday respectively
SELECT cron.schedule(
  'blog-pregenerate',
  '0 3 * * 1,3,5',  -- 3 AM UTC on Mon/Wed/Fri (10 PM EST previous day)
  $$SELECT public.trigger_blog_pregeneration()$$
);

-- Schedule publishing: Monday, Wednesday, Friday at 6 AM EST (11 AM UTC)
SELECT cron.schedule(
  'blog-publish',
  '0 11 * * 1,3,5',  -- 11 AM UTC (6 AM EST)
  $$SELECT public.trigger_blog_publish()$$
);

-- Backup publish attempt at 6:15 AM EST in case first one fails
SELECT cron.schedule(
  'blog-publish-backup',
  '15 11 * * 1,3,5',  -- 11:15 AM UTC (6:15 AM EST)
  $$SELECT public.trigger_blog_publish()$$
);

COMMENT ON TABLE public.blog_generation_failures IS 'Tracks blog pre-generation failures for admin notifications';
