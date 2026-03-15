-- Restaurant Marketing Suite
-- Enables restaurant owners to manage email contacts, send email campaigns,
-- and send push notifications from their dashboard.

-- ─────────────────────────────────────────────────────────
-- 1. restaurant_contacts — imported email lists per restaurant
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_contacts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  email           VARCHAR(255) NOT NULL,
  name            VARCHAR(255),
  source          VARCHAR(50) DEFAULT 'manual',  -- manual, csv_import
  is_unsubscribed BOOLEAN     DEFAULT FALSE,
  unsubscribed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, email)
);

CREATE INDEX idx_restaurant_contacts_restaurant ON restaurant_contacts(restaurant_id);
CREATE INDEX idx_restaurant_contacts_email ON restaurant_contacts(email);
CREATE INDEX idx_restaurant_contacts_active ON restaurant_contacts(restaurant_id, is_unsubscribed) WHERE NOT is_unsubscribed;

-- ─────────────────────────────────────────────────────────
-- 2. restaurant_email_campaigns — email campaign metadata
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_email_campaigns (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  subject         VARCHAR(500) NOT NULL,
  preview_text    VARCHAR(255),
  body            TEXT        NOT NULL,
  cta_text        VARCHAR(100),
  cta_url         VARCHAR(500),
  status          VARCHAR(20) DEFAULT 'draft',  -- draft, sending, sent, failed
  recipient_count INTEGER     DEFAULT 0,
  sent_count      INTEGER     DEFAULT 0,
  opened_count    INTEGER     DEFAULT 0,
  sent_at         TIMESTAMPTZ,
  created_by      UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_restaurant_email_campaigns_restaurant ON restaurant_email_campaigns(restaurant_id);
CREATE INDEX idx_restaurant_email_campaigns_status ON restaurant_email_campaigns(status);
CREATE INDEX idx_restaurant_email_campaigns_sent_at ON restaurant_email_campaigns(sent_at DESC);

-- ─────────────────────────────────────────────────────────
-- 3. restaurant_email_sends — per-recipient send tracking
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_email_sends (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID        NOT NULL REFERENCES restaurant_email_campaigns(id) ON DELETE CASCADE,
  restaurant_id UUID      NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  contact_id  UUID        NOT NULL REFERENCES restaurant_contacts(id) ON DELETE CASCADE,
  email       VARCHAR(255) NOT NULL,
  resend_id   VARCHAR(100),
  status      VARCHAR(20) DEFAULT 'queued',  -- queued, sent, delivered, opened, bounced, failed
  opened_at   TIMESTAMPTZ,
  sent_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_restaurant_email_sends_campaign ON restaurant_email_sends(campaign_id);
CREATE INDEX idx_restaurant_email_sends_resend_id ON restaurant_email_sends(resend_id);

-- ─────────────────────────────────────────────────────────
-- 4. restaurant_push_campaigns — push notification history
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_push_campaigns (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID        NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title           VARCHAR(200) NOT NULL,
  body            VARCHAR(500) NOT NULL,
  audience        VARCHAR(20) NOT NULL DEFAULT 'favorites',  -- favorites, checked_in, all_market
  status          VARCHAR(20) DEFAULT 'draft',  -- draft, sent, failed
  recipient_count INTEGER     DEFAULT 0,
  sent_count      INTEGER     DEFAULT 0,
  sent_at         TIMESTAMPTZ,
  created_by      UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_restaurant_push_campaigns_restaurant ON restaurant_push_campaigns(restaurant_id);
CREATE INDEX idx_restaurant_push_campaigns_sent_at ON restaurant_push_campaigns(sent_at DESC);

-- ─────────────────────────────────────────────────────────
-- RLS Policies
-- ─────────────────────────────────────────────────────────
ALTER TABLE restaurant_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_push_campaigns ENABLE ROW LEVEL SECURITY;

-- Service role full access (API routes use createServiceRoleClient)
CREATE POLICY "Service role full access on restaurant_contacts"
  ON restaurant_contacts FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on restaurant_email_campaigns"
  ON restaurant_email_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on restaurant_email_sends"
  ON restaurant_email_sends FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on restaurant_push_campaigns"
  ON restaurant_push_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Owners can read their own restaurant's data
CREATE POLICY "Owners can view own contacts"
  ON restaurant_contacts FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can view own email campaigns"
  ON restaurant_email_campaigns FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can view own email sends"
  ON restaurant_email_sends FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "Owners can view own push campaigns"
  ON restaurant_push_campaigns FOR SELECT TO authenticated
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

-- updated_at triggers (reuse existing function)
CREATE TRIGGER update_restaurant_contacts_updated_at
  BEFORE UPDATE ON restaurant_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurant_email_campaigns_updated_at
  BEFORE UPDATE ON restaurant_email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
