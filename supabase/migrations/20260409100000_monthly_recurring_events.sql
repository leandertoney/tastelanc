-- Add monthly recurring event support
-- Adds recurrence_frequency (weekly/monthly) and monthly_pattern (JSONB) columns
-- Existing events default to 'weekly' — zero data migration needed

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS recurrence_frequency TEXT DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS monthly_pattern JSONB;

-- Validate frequency values
ALTER TABLE public.events
  ADD CONSTRAINT events_recurrence_frequency_check
  CHECK (recurrence_frequency IN ('weekly', 'monthly'));

COMMENT ON COLUMN public.events.recurrence_frequency IS 'weekly (default) or monthly. Only meaningful when is_recurring = true.';
COMMENT ON COLUMN public.events.monthly_pattern IS 'JSONB array of {week, day} objects for monthly events. E.g. [{"week":1,"day":"sunday"},{"week":2,"day":"tuesday"}]';
