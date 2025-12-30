-- Create consumer_subscriptions table for TasteLanc+ premium users
CREATE TABLE IF NOT EXISTS consumer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  billing_period TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly', 'lifetime'
  is_founder BOOLEAN DEFAULT FALSE, -- True for early access subscribers
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE consumer_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own subscription
CREATE POLICY "Users can read own subscription" ON consumer_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all (for webhooks)
CREATE POLICY "Service role full access" ON consumer_subscriptions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Admin can read all subscriptions
CREATE POLICY "Admin can read all consumer subscriptions" ON consumer_subscriptions
  FOR SELECT TO authenticated
  USING (auth.email() = 'admin@tastelanc.com');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_consumer_subscriptions_user_id ON consumer_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_consumer_subscriptions_status ON consumer_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_consumer_subscriptions_stripe_customer ON consumer_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_consumer_subscriptions_created_at ON consumer_subscriptions(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_consumer_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER consumer_subscriptions_updated_at
  BEFORE UPDATE ON consumer_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_consumer_subscription_updated_at();

-- Create analytics_page_views view/table for admin dashboard compatibility
CREATE TABLE IF NOT EXISTS analytics_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type TEXT NOT NULL DEFAULT 'other', -- 'home', 'restaurant', 'premium', 'events', etc.
  page_path TEXT NOT NULL,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  visitor_id TEXT,
  referrer TEXT,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on analytics_page_views
ALTER TABLE analytics_page_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert page views
CREATE POLICY "Anyone can track page views" ON analytics_page_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Policy: Admin can read all page views
CREATE POLICY "Admin can read analytics page views" ON analytics_page_views
  FOR SELECT TO authenticated
  USING (auth.email() = 'admin@tastelanc.com');

-- Create indexes for analytics_page_views
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_viewed_at ON analytics_page_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_page_type ON analytics_page_views(page_type);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_restaurant_id ON analytics_page_views(restaurant_id);

-- Create analytics_clicks table
CREATE TABLE IF NOT EXISTS analytics_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  click_type TEXT NOT NULL, -- 'phone', 'website', 'directions', 'menu', 'reservation', etc.
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  visitor_id TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on analytics_clicks
ALTER TABLE analytics_clicks ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert clicks
CREATE POLICY "Anyone can track clicks" ON analytics_clicks
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Policy: Admin can read all clicks
CREATE POLICY "Admin can read analytics clicks" ON analytics_clicks
  FOR SELECT TO authenticated
  USING (auth.email() = 'admin@tastelanc.com');

-- Create indexes for analytics_clicks
CREATE INDEX IF NOT EXISTS idx_analytics_clicks_clicked_at ON analytics_clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_clicks_click_type ON analytics_clicks(click_type);
CREATE INDEX IF NOT EXISTS idx_analytics_clicks_restaurant_id ON analytics_clicks(restaurant_id);
