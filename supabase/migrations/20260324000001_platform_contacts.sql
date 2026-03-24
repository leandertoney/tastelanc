-- Platform Contacts — TasteLanc's master contact list
-- Sources: direct admin uploads + auto-sync from restaurant_contacts

CREATE TABLE IF NOT EXISTS platform_contacts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) NOT NULL,
  name            VARCHAR(255),
  source_label    VARCHAR(255) NOT NULL DEFAULT 'TasteLanc Direct',
  -- If synced from a restaurant upload, track which restaurant
  restaurant_id   UUID        REFERENCES restaurants(id) ON DELETE SET NULL,
  market_id       UUID        REFERENCES markets(id) ON DELETE SET NULL,
  is_unsubscribed BOOLEAN     DEFAULT FALSE,
  unsubscribed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email)
);

CREATE INDEX idx_platform_contacts_email      ON platform_contacts(email);
CREATE INDEX idx_platform_contacts_market     ON platform_contacts(market_id);
CREATE INDEX idx_platform_contacts_source     ON platform_contacts(source_label);
CREATE INDEX idx_platform_contacts_created_at ON platform_contacts(created_at DESC);

-- ─────────────────────────────────────────────────────────
-- RLS — service role only (admin routes use service client)
-- ─────────────────────────────────────────────────────────
ALTER TABLE platform_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on platform_contacts"
  ON platform_contacts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────
CREATE TRIGGER update_platform_contacts_updated_at
  BEFORE UPDATE ON platform_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────
-- Auto-sync trigger: whenever a restaurant uploads a contact,
-- upsert it into platform_contacts (email is unique — existing
-- rows are left unchanged so manual edits aren't overwritten)
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_restaurant_contact_to_platform()
RETURNS TRIGGER AS $$
DECLARE
  v_restaurant_name TEXT;
  v_market_id UUID;
BEGIN
  -- Get restaurant name and market for the source label
  SELECT name, market_id INTO v_restaurant_name, v_market_id
  FROM restaurants
  WHERE id = NEW.restaurant_id;

  INSERT INTO platform_contacts (email, name, source_label, restaurant_id, market_id)
  VALUES (
    NEW.email,
    NEW.name,
    COALESCE(v_restaurant_name, 'Restaurant Upload'),
    NEW.restaurant_id,
    v_market_id
  )
  ON CONFLICT (email) DO NOTHING;
  -- DO NOTHING: preserve existing record if already in master list
  -- (e.g. contact was uploaded directly first, or from another restaurant)

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_restaurant_contact_to_platform_trigger
  AFTER INSERT ON restaurant_contacts
  FOR EACH ROW EXECUTE FUNCTION sync_restaurant_contact_to_platform();
