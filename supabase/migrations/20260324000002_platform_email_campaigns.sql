-- Platform Email Campaigns — admin-level campaigns sent to platform_contacts
-- Separate from restaurant_email_campaigns (which are sent by restaurant owners)

CREATE TABLE IF NOT EXISTS platform_email_campaigns (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,          -- internal name, e.g. "Sunchild $50 Giveaway"
  subject         VARCHAR(500) NOT NULL,
  preview_text    VARCHAR(255),
  body            TEXT        NOT NULL,
  cta_text        VARCHAR(100),
  cta_url         VARCHAR(500),
  -- Audience: send to all platform_contacts or filter by source/market
  audience_source VARCHAR(255),                   -- NULL = all, or source_label to filter
  audience_market_id UUID REFERENCES markets(id), -- NULL = all markets
  status          VARCHAR(20) DEFAULT 'draft',    -- draft, sent, failed
  recipient_count INTEGER     DEFAULT 0,
  sent_count      INTEGER     DEFAULT 0,
  sent_at         TIMESTAMPTZ,
  created_by      UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE platform_email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on platform_email_campaigns"
  ON platform_email_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_platform_email_campaigns_updated_at
  BEFORE UPDATE ON platform_email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed: Sunchild $50 gift card giveaway template (draft)
INSERT INTO platform_email_campaigns (
  name,
  subject,
  preview_text,
  body,
  cta_text,
  cta_url,
  audience_source,
  audience_market_id,
  status
) VALUES (
  'Sunchild $50 Gift Card Giveaway',
  'Win a $50 Sunchild Gift Card 🎉',
  'Download TasteCumberland and enter to win',
  E'We''ve partnered with Sunchild Hair Studio to bring you something special.\n\nTasteCumberland is the free local app that helps you discover the best restaurants, happy hours, events, and specials in Cumberland County — all in one place.\n\nDownload the app, sign in with your email, and you''re automatically entered to win a $50 Sunchild Hair Studio gift card.\n\nOne winner will be selected at random. The more you explore, the more you''ll love it — but you only need to sign in once to be entered.\n\nGood luck!',
  'Download TasteCumberland — Enter to Win',
  'https://tastecumberland.com/download',
  'Sunchild Hair Studio',
  '0602afe2-fae2-4e46-af2c-7b374bfc9d45',
  'draft'
);
