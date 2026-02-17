-- Add Cumberland County (Mollie) blog generation cron jobs
-- These mirror the Lancaster (Rosie) jobs but pass market_slug='cumberland-pa'
-- Offset by 5 minutes to avoid resource contention with Lancaster jobs

-- Function to call the pre-generation API for Cumberland
CREATE OR REPLACE FUNCTION public.trigger_blog_pregeneration_cumberland()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://tastelanc.com/api/blog/pregenerate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
    ),
    body := jsonb_build_object('source', 'pg_cron', 'market_slug', 'cumberland-pa')
  );
END;
$$;

-- Function to call the publishing API for Cumberland
CREATE OR REPLACE FUNCTION public.trigger_blog_publish_cumberland()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://tastelanc.com/api/blog/publish-scheduled',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
    ),
    body := jsonb_build_object('source', 'pg_cron', 'market_slug', 'cumberland-pa')
  );
END;
$$;

-- Schedule Cumberland pre-generation: Mon/Wed/Fri at 3:05 AM UTC (10:05 PM EST previous day)
-- 5 min after Lancaster to avoid OpenAI rate limits
SELECT cron.schedule(
  'blog-pregenerate-cumberland',
  '5 3 * * 1,3,5',
  $$SELECT public.trigger_blog_pregeneration_cumberland()$$
);

-- Schedule Cumberland publishing: Mon/Wed/Fri at 11:05 AM UTC (6:05 AM EST)
SELECT cron.schedule(
  'blog-publish-cumberland',
  '5 11 * * 1,3,5',
  $$SELECT public.trigger_blog_publish_cumberland()$$
);

-- Backup Cumberland publish attempt at 11:20 AM UTC (6:20 AM EST)
SELECT cron.schedule(
  'blog-publish-backup-cumberland',
  '20 11 * * 1,3,5',
  $$SELECT public.trigger_blog_publish_cumberland()$$
);
