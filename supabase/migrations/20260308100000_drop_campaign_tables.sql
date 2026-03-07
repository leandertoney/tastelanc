-- Drop email campaign system (replaced by CRM sales inbox)
-- Keeps: email_sends (used by CRM), business_leads (used by sales pipeline)

-- Drop campaign-tracking functions
DROP FUNCTION IF EXISTS increment_campaign_opens(UUID);
DROP FUNCTION IF EXISTS increment_campaign_clicks(UUID);
DROP FUNCTION IF EXISTS increment_campaign_bounces(UUID);
DROP FUNCTION IF EXISTS increment_scheduled_campaign_opens(UUID);
DROP FUNCTION IF EXISTS increment_scheduled_campaign_clicks(UUID);
DROP FUNCTION IF EXISTS increment_scheduled_campaign_bounces(UUID);

-- Remove campaign foreign keys from email_sends before dropping parent tables
ALTER TABLE email_sends DROP CONSTRAINT IF EXISTS email_sends_campaign_id_fkey;
ALTER TABLE email_sends DROP CONSTRAINT IF EXISTS email_sends_scheduled_campaign_id_fkey;
ALTER TABLE email_sends DROP COLUMN IF EXISTS campaign_id;
ALTER TABLE email_sends DROP COLUMN IF EXISTS scheduled_campaign_id;

-- Drop campaign-only tables
DROP TABLE IF EXISTS automation_logs;
DROP TABLE IF EXISTS scheduled_campaigns;
DROP TABLE IF EXISTS email_templates;
DROP TABLE IF EXISTS email_campaigns;
