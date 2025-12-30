-- Email Campaigns Table
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  preview_text VARCHAR(255),
  headline VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  cta_text VARCHAR(100),
  cta_url VARCHAR(500),
  segment VARCHAR(50) DEFAULT 'unconverted',
  status VARCHAR(20) DEFAULT 'draft',
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Sends Table (tracks individual sends)
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_id UUID,
  resend_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  error_message TEXT
);

-- Indexes for email_sends
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_resend_id ON email_sends(resend_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_recipient ON email_sends(recipient_email);

-- Email Unsubscribes Table
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL
);

-- Index for unsubscribes
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email ON email_unsubscribes(email);

-- Enable RLS (Row Level Security)
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Policies for service role access (admin operations via API routes)
CREATE POLICY "Service role full access to email_campaigns" ON email_campaigns
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to email_sends" ON email_sends
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to email_unsubscribes" ON email_unsubscribes
  FOR ALL USING (true) WITH CHECK (true);
