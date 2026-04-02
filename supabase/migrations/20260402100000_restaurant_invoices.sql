-- Restaurant invoices tracking table
-- Tracks Stripe invoices for restaurants, supports auto-downgrade/upgrade pipeline

CREATE TABLE IF NOT EXISTS restaurant_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  stripe_invoice_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'open',
  -- status values: open | past_due | paid | void | uncollectible | downgraded
  due_date timestamptz,
  paid_at timestamptz,
  invoice_url text,
  -- Tier management: store the tier before downgrade so we can restore it
  tier_before_downgrade_id uuid REFERENCES tiers(id),
  downgraded_at timestamptz,
  -- Reminder tracking
  reminders_sent integer NOT NULL DEFAULT 0,
  last_reminder_at timestamptz,
  -- Notes from admin
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_restaurant_invoices_restaurant_id ON restaurant_invoices(restaurant_id);
CREATE INDEX idx_restaurant_invoices_status ON restaurant_invoices(status);
CREATE INDEX idx_restaurant_invoices_stripe_invoice_id ON restaurant_invoices(stripe_invoice_id);
CREATE INDEX idx_restaurant_invoices_due_date ON restaurant_invoices(due_date);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_restaurant_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER restaurant_invoices_updated_at
  BEFORE UPDATE ON restaurant_invoices
  FOR EACH ROW EXECUTE FUNCTION update_restaurant_invoices_updated_at();

-- RLS: admin-only access
ALTER TABLE restaurant_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to restaurant_invoices"
  ON restaurant_invoices FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
