-- Weekly recap push notification cron job
-- Fires at 19:00 UTC = 2:00 PM ET (EST) every Sunday
-- Sends personalized recap to active users, FOMO-inducing stats to inactive users

CREATE OR REPLACE FUNCTION public.trigger_weekly_recap_notification()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://tastelanc.com/api/cron/weekly-recap',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Schedule: every Sunday at 19:00 UTC (2pm ET)
SELECT cron.schedule(
  'weekly-recap-notification',
  '0 19 * * 0',
  $$SELECT public.trigger_weekly_recap_notification()$$
);
