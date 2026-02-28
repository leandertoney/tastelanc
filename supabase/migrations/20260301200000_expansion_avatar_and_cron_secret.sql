-- Add avatar_image_url to brand drafts for DALL-E generated mascot images
ALTER TABLE expansion_brand_drafts
ADD COLUMN IF NOT EXISTS avatar_image_url text;

-- Ensure the expansion-avatars path is accessible in the images bucket
-- (No new bucket needed — we use the existing 'images' bucket)

-- Update expansion agent cron trigger to include CRON_SECRET in the HTTP call
-- (replaces the old current_setting('app.settings.cron_secret') approach which
-- required superuser ALTER DATABASE permission)
CREATE OR REPLACE FUNCTION public.trigger_expansion_agent()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://tastelanc.com/api/cron/expansion-agent',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 876456bac7b8a1d35318d38f7292858266e443606d9e54e41986583a297ab95a'
    ),
    body := jsonb_build_object('source', 'pg_cron')
  );
END;
$$;
