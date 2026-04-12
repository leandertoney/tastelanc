-- Platform email campaign send tracking
-- Mirrors restaurant_email_sends structure for platform-level campaigns

CREATE TABLE IF NOT EXISTS platform_email_sends (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID        NOT NULL REFERENCES platform_email_campaigns(id) ON DELETE CASCADE,
  contact_id    UUID        NOT NULL REFERENCES platform_contacts(id) ON DELETE CASCADE,
  email         VARCHAR(255) NOT NULL,
  resend_id     VARCHAR(100),
  status        VARCHAR(20) DEFAULT 'queued',  -- queued, sent, delivered, opened, clicked, bounced, failed
  opened_at     TIMESTAMPTZ,
  clicked_at    TIMESTAMPTZ,
  bounced_at    TIMESTAMPTZ,
  error_message TEXT,
  sent_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_email_sends_campaign ON platform_email_sends(campaign_id);
CREATE INDEX idx_platform_email_sends_resend_id ON platform_email_sends(resend_id);

ALTER TABLE platform_email_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on platform_email_sends"
  ON platform_email_sends FOR ALL TO service_role USING (true) WITH CHECK (true);
