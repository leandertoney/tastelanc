-- Cron job: check for AI-approved video recommendations whose 30-min countdown
-- has expired, and post them as Instagram Reels.
-- Runs every 5 minutes to catch countdowns as they expire.

SELECT cron.schedule(
  'instagram-post-recommendations',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url := 'https://tastelanc.com/api/instagram/post-recommendations',
    body := '{"source": "pg_cron"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 9e98786de33d85396badebb998129d54f879970287be03f1ed5704a8663e6912'
    )
  )$$
);
