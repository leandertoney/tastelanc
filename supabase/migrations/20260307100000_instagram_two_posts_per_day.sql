-- Support 2 posts per day: change unique constraint from (market_id, post_date)
-- to (market_id, post_date, content_type) so we can have e.g. happy_hours AM + events PM

-- Drop old unique constraint
ALTER TABLE public.instagram_posts DROP CONSTRAINT IF EXISTS instagram_posts_market_id_post_date_key;

-- Add new unique constraint allowing one post per content_type per day
ALTER TABLE public.instagram_posts ADD CONSTRAINT instagram_posts_market_date_type_key
  UNIQUE(market_id, post_date, content_type);

-- Add post_slot column to track AM/PM scheduling
ALTER TABLE public.instagram_posts ADD COLUMN IF NOT EXISTS post_slot TEXT DEFAULT 'am'
  CHECK (post_slot IN ('am', 'pm'));

-- Allow 'upcoming_events' content type
ALTER TABLE public.instagram_posts DROP CONSTRAINT IF EXISTS instagram_posts_content_type_check;
ALTER TABLE public.instagram_posts ADD CONSTRAINT instagram_posts_content_type_check
  CHECK (content_type IN ('tonight_today', 'weekend_preview', 'category_roundup', 'upcoming_events'));

-- Second daily cron: 9:30 PM UTC = 5:30 PM EDT (evening events post)
SELECT cron.schedule(
  'instagram-evening-lancaster',
  '30 21 * * *',
  $$SELECT net.http_post(
    url := 'https://tastelanc.com/api/instagram/cron',
    body := '{"market_slug": "lancaster-pa", "source": "pg_cron", "force_type": "upcoming_events", "post_slot": "pm"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 9e98786de33d85396badebb998129d54f879970287be03f1ed5704a8663e6912'
    )
  )$$
);

-- Cumberland evening post offset by 5 minutes
SELECT cron.schedule(
  'instagram-evening-cumberland',
  '35 21 * * *',
  $$SELECT net.http_post(
    url := 'https://tastelanc.com/api/instagram/cron',
    body := '{"market_slug": "cumberland-pa", "source": "pg_cron", "force_type": "upcoming_events", "post_slot": "pm"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 9e98786de33d85396badebb998129d54f879970287be03f1ed5704a8663e6912'
    )
  )$$
);
