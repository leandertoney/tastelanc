-- Add personal/direct contact fields to business_leads
ALTER TABLE public.business_leads
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_title TEXT;

COMMENT ON COLUMN public.business_leads.contact_phone IS 'Direct/personal phone number of the decision-maker';
COMMENT ON COLUMN public.business_leads.contact_email IS 'Direct/personal email of the decision-maker';
COMMENT ON COLUMN public.business_leads.contact_title IS 'Job title of the contact person (e.g. owner, general manager)';
