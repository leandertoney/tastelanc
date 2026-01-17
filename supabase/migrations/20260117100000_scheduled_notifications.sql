-- Create a table to log notification jobs
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  status TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying recent logs
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at DESC);

-- Comments
COMMENT ON TABLE notification_logs IS 'Log of push notification jobs for debugging';

-- Note: To schedule automatic happy hour alerts, set up a cron job to call:
-- POST https://[your-project].supabase.co/functions/v1/send-notifications/happy-hour-alerts
--
-- Recommended schedule: Every 30 minutes from 2pm-10pm
-- Cron expression: */30 14-22 * * *
--
-- Options for scheduling:
-- 1. Vercel Cron (if using Vercel): Add to vercel.json
-- 2. GitHub Actions: Create a scheduled workflow
-- 3. External cron service (cron-job.org, etc.)
