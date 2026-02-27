-- Daily "Today's Pick" push notification cron job
-- Fires at 21:00 UTC = 4:00 PM ET (EST) every day
-- In EDT (summer), this fires at 5:00 PM ET — still a good time.

-- Function to trigger the Today's Pick notification
CREATE OR REPLACE FUNCTION public.trigger_todays_pick_notification()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://tastelanc.com/api/cron/todays-pick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Schedule: every day at 21:00 UTC (4pm ET)
SELECT cron.schedule(
  'todays-pick-notification',
  '0 21 * * *',
  $$SELECT public.trigger_todays_pick_notification()$$
);
