-- Update notification timing: move Today's Pick to 11 AM ET, add throttle support
--
-- Changes:
-- 1. Replace single todays-pick-notification cron with per-market jobs at 16:00 UTC (11 AM EST / 12 PM EDT)
-- 2. Add market_slug column to notification_logs for efficient throttle queries

-- ── 1. Add market_slug to notification_logs ──────────────────────────────────

ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS market_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_notification_logs_throttle
  ON notification_logs (market_slug, created_at DESC)
  WHERE status = 'completed';

-- ── 2. Replace Today's Pick cron schedule ────────────────────────────────────

-- Remove the old single job (fires at 21:00 UTC = 4 PM EST)
SELECT cron.unschedule('todays-pick-notification');

-- Create per-market trigger functions that pass market_slug in the request body

CREATE OR REPLACE FUNCTION public.trigger_todays_pick_lancaster()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://tastelanc.com/api/cron/todays-pick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 876456bac7b8a1d35318d38f7292858266e443606d9e54e41986583a297ab95a'
    ),
    body := '{"market_slug": "lancaster-pa"}'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_todays_pick_cumberland()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://tastelanc.com/api/cron/todays-pick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 876456bac7b8a1d35318d38f7292858266e443606d9e54e41986583a297ab95a'
    ),
    body := '{"market_slug": "cumberland-pa"}'::jsonb
  );
END;
$$;

-- Lancaster: 16:00 UTC = 11:00 AM EST / 12:00 PM EDT
SELECT cron.schedule(
  'todays-pick-lancaster',
  '0 16 * * *',
  $$SELECT public.trigger_todays_pick_lancaster()$$
);

-- Cumberland: 16:05 UTC = 11:05 AM EST / 12:05 PM EDT
SELECT cron.schedule(
  'todays-pick-cumberland',
  '5 16 * * *',
  $$SELECT public.trigger_todays_pick_cumberland()$$
);
