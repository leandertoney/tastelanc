-- Sales Rep Enhancements: Email tracking on email_sends + sender preferences on sales_reps

-- Add lead tracking and sender info to email_sends
ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES business_leads(id) ON DELETE SET NULL;
ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES auth.users(id);
ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE email_sends ADD COLUMN IF NOT EXISTS sender_email TEXT;

CREATE INDEX IF NOT EXISTS idx_email_sends_lead_id ON email_sends(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_sends_sent_by ON email_sends(sent_by) WHERE sent_by IS NOT NULL;

-- Sender preferences on sales_reps
ALTER TABLE sales_reps ADD COLUMN IF NOT EXISTS preferred_sender_name TEXT;
ALTER TABLE sales_reps ADD COLUMN IF NOT EXISTS preferred_sender_email TEXT;
