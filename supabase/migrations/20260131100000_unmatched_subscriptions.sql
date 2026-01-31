-- Create table to track Stripe subscriptions that couldn't be auto-matched to restaurants
CREATE TABLE IF NOT EXISTS unmatched_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  business_name TEXT,
  amount_cents INTEGER,
  billing_interval TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, matched, ignored
  match_attempts JSONB DEFAULT '[]'::jsonb, -- Log of what matching was tried
  matched_restaurant_id UUID REFERENCES restaurants(id),
  matched_at TIMESTAMPTZ,
  matched_by TEXT, -- 'auto' or admin user id
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_unmatched_subscriptions_status ON unmatched_subscriptions(status);
CREATE INDEX idx_unmatched_subscriptions_customer_id ON unmatched_subscriptions(stripe_customer_id);
CREATE INDEX idx_unmatched_subscriptions_email ON unmatched_subscriptions(customer_email);

-- Enable RLS
ALTER TABLE unmatched_subscriptions ENABLE ROW LEVEL SECURITY;

-- Only admins can access this table
CREATE POLICY "Admins can manage unmatched subscriptions" ON unmatched_subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = 'admin@tastelanc.com'
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_unmatched_subscriptions_updated_at
  BEFORE UPDATE ON unmatched_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE unmatched_subscriptions IS 'Tracks Stripe subscriptions that could not be automatically matched to a restaurant in the database';
