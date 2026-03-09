-- Add assigned_to field to sales_meetings
-- Allows meetings to be assigned to any team member (not just the creator)
-- When a meeting is assigned to a rep, a lead is automatically created for them

ALTER TABLE sales_meetings
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_sales_meetings_assigned_to
  ON sales_meetings(assigned_to)
  WHERE assigned_to IS NOT NULL;
