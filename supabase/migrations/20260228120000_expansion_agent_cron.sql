-- Autonomous City Expansion Agent — pg_cron schedule
-- Runs every 6 hours to advance cities through the expansion pipeline.
-- The agent suggests new cities, researches them, generates brands & job listings,
-- and pauses at approval gates for the admin to review.

-- Function to trigger the expansion agent
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
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
    ),
    body := jsonb_build_object('source', 'pg_cron')
  );
END;
$$;

-- Schedule: every 6 hours at minute 30 (0:30, 6:30, 12:30, 18:30 UTC)
-- Using minute 30 to avoid contention with other cron jobs at the top of the hour
SELECT cron.schedule(
  'expansion-agent',
  '30 0,6,12,18 * * *',
  $$SELECT public.trigger_expansion_agent()$$
);
