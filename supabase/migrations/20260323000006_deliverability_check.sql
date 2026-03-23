-- Add deliverability check status to restaurants table
-- Tracks whether a restaurant owner has completed the email deliverability warmup step

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS deliverability_check_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deliverability_check_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Valid values: NULL (not seen), 'pending' (email sent), 'confirmed' (owner replied), 'dismissed' (skipped)
