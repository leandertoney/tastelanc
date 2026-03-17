-- Add 'instagram' as a valid activity type for sales CRM lead activities
ALTER TABLE public.lead_activities DROP CONSTRAINT IF EXISTS lead_activities_activity_type_check;
ALTER TABLE public.lead_activities ADD CONSTRAINT lead_activities_activity_type_check
  CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'follow_up', 'status_change', 'instagram'));
