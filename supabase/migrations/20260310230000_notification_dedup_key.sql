-- Add dedup_key to notification_logs for atomic dedup via unique index.
-- Two concurrent cron triggers for the same market/day cannot both succeed.
ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS dedup_key TEXT;

-- Unique index ensures only one completed notification per dedup_key.
-- INSERT ... ON CONFLICT (dedup_key) DO NOTHING provides atomic dedup.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_logs_dedup_key
  ON notification_logs (dedup_key)
  WHERE dedup_key IS NOT NULL AND status = 'completed';
