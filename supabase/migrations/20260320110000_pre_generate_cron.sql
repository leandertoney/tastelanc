-- pg_cron job: pre-generate notifications for all markets every morning at 7 AM ET.
-- Fires at 11:00 UTC = 7:00 AM EST / 8:00 AM EDT — well before the 8 AM email reminder.
-- Fills the next 14 days of scheduled_notifications for all active markets.

CREATE OR REPLACE FUNCTION public.trigger_pre_generate_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://tastelanc.com/api/cron/pre-generate-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 876456bac7b8a1d35318d38f7292858266e443606d9e54e41986583a297ab95a'
    ),
    body := '{}'::jsonb
  );
END;
$$;

SELECT cron.schedule(
  'pre-generate-notifications',
  '0 11 * * *',
  $$SELECT public.trigger_pre_generate_notifications()$$
);
