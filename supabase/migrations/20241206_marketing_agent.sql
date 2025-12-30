-- Marketing Agent Tables
-- Adds: business_leads, email_templates, scheduled_campaigns, automation_logs
-- Extends: email_campaigns with B2B support

-- =============================================
-- Business Leads Table (B2B cold outreach)
-- =============================================
CREATE TABLE IF NOT EXISTS business_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  website VARCHAR(500),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50) DEFAULT 'PA',
  zip_code VARCHAR(20),
  category VARCHAR(100), -- restaurant, bar, cafe, brewery, etc.
  source VARCHAR(100) DEFAULT 'manual', -- manual, import, contact_form
  status VARCHAR(50) DEFAULT 'new', -- new, contacted, interested, not_interested, converted
  last_contacted_at TIMESTAMPTZ,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for business_leads
CREATE INDEX IF NOT EXISTS idx_business_leads_email ON business_leads(email);
CREATE INDEX IF NOT EXISTS idx_business_leads_status ON business_leads(status);
CREATE INDEX IF NOT EXISTS idx_business_leads_category ON business_leads(category);
CREATE INDEX IF NOT EXISTS idx_business_leads_city ON business_leads(city);
CREATE INDEX IF NOT EXISTS idx_business_leads_created_at ON business_leads(created_at DESC);

-- =============================================
-- Email Templates Table (reusable templates)
-- =============================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL, -- consumer, b2b_cold, b2b_followup, announcement, countdown
  subject VARCHAR(500) NOT NULL,
  preview_text VARCHAR(255),
  headline VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  cta_text VARCHAR(100),
  cta_url VARCHAR(500),
  is_ai_generated BOOLEAN DEFAULT FALSE,
  ai_prompt TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email_templates
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_at ON email_templates(created_at DESC);

-- =============================================
-- Scheduled Campaigns Table (automation)
-- =============================================
CREATE TABLE IF NOT EXISTS scheduled_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  campaign_type VARCHAR(50) NOT NULL, -- scheduled, countdown, trigger
  target_audience VARCHAR(50) NOT NULL, -- consumer_all, consumer_unconverted, consumer_converted, business_leads

  -- For scheduled campaigns (one-time send at specific time)
  scheduled_at TIMESTAMPTZ,

  -- For countdown series (send X days before target date)
  countdown_target_date DATE,
  days_before INTEGER,

  -- For trigger-based campaigns
  trigger_event VARCHAR(100), -- new_signup, new_conversion, new_business_lead
  trigger_delay_minutes INTEGER DEFAULT 0,

  -- Email content (can reference template or inline)
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  subject VARCHAR(500),
  preview_text VARCHAR(255),
  headline VARCHAR(500),
  body TEXT,
  cta_text VARCHAR(100),
  cta_url VARCHAR(500),

  -- B2B filters (when target_audience is business_leads)
  business_lead_filter JSONB, -- { status: [], category: [], tags: [] }

  -- Status tracking
  status VARCHAR(20) DEFAULT 'active', -- active, paused, completed, cancelled
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  total_sent INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for scheduled_campaigns
CREATE INDEX IF NOT EXISTS idx_scheduled_campaigns_status ON scheduled_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_campaigns_next_run ON scheduled_campaigns(next_run_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_campaigns_type ON scheduled_campaigns(campaign_type);

-- =============================================
-- Automation Logs Table (execution history)
-- =============================================
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_campaign_id UUID REFERENCES scheduled_campaigns(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  trigger_event VARCHAR(100),
  trigger_data JSONB,
  emails_sent INTEGER DEFAULT 0,
  emails_failed INTEGER DEFAULT 0,
  status VARCHAR(20), -- success, partial, failed
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for automation_logs
CREATE INDEX IF NOT EXISTS idx_automation_logs_campaign ON automation_logs(scheduled_campaign_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_executed ON automation_logs(executed_at DESC);

-- =============================================
-- Extend email_campaigns for B2B support
-- =============================================
ALTER TABLE email_campaigns
ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(50) DEFAULT 'consumer',
ADD COLUMN IF NOT EXISTS business_lead_filter JSONB,
ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS scheduled_campaign_id UUID REFERENCES scheduled_campaigns(id) ON DELETE SET NULL;

-- =============================================
-- B2B Unsubscribes Table (separate from consumer)
-- =============================================
CREATE TABLE IF NOT EXISTS b2b_unsubscribes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_b2b_unsubscribes_email ON b2b_unsubscribes(email);

-- =============================================
-- Enable RLS (Row Level Security)
-- =============================================
ALTER TABLE business_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_unsubscribes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Policies for service role access
-- =============================================
CREATE POLICY "Service role full access to business_leads" ON business_leads
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to email_templates" ON email_templates
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to scheduled_campaigns" ON scheduled_campaigns
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to automation_logs" ON automation_logs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to b2b_unsubscribes" ON b2b_unsubscribes
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- Helper function to update updated_at timestamp
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_business_leads_updated_at ON business_leads;
CREATE TRIGGER update_business_leads_updated_at
  BEFORE UPDATE ON business_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheduled_campaigns_updated_at ON scheduled_campaigns;
CREATE TRIGGER update_scheduled_campaigns_updated_at
  BEFORE UPDATE ON scheduled_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
