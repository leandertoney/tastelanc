-- Tier-based Analytics Tables
-- Tracks when users encounter locked content to measure conversion opportunity

-- =====================================================
-- Locked Content Views Tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS public.locked_content_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  restaurant_name TEXT NOT NULL,
  tier TEXT NOT NULL,
  feature_name TEXT NOT NULL, -- 'menu', 'happy_hours', 'specials', 'events'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_locked_views_restaurant
  ON public.locked_content_views(restaurant_id, feature_name);

CREATE INDEX IF NOT EXISTS idx_locked_views_timestamp
  ON public.locked_content_views(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_locked_views_tier
  ON public.locked_content_views(tier, feature_name);

CREATE INDEX IF NOT EXISTS idx_locked_views_user
  ON public.locked_content_views(user_id)
  WHERE user_id IS NOT NULL;

-- =====================================================
-- Upgrade Button Clicks Tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS public.upgrade_button_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  restaurant_name TEXT NOT NULL,
  feature_name TEXT NOT NULL, -- Which locked feature prompted the click
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upgrade_clicks_restaurant
  ON public.upgrade_button_clicks(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_upgrade_clicks_timestamp
  ON public.upgrade_button_clicks(timestamp DESC);

-- =====================================================
-- Content Share Requests Tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS public.content_share_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  restaurant_name TEXT NOT NULL,
  feature_name TEXT NOT NULL, -- Which content was being shared
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_requests_restaurant
  ON public.content_share_requests(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_share_requests_timestamp
  ON public.content_share_requests(timestamp DESC);

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE public.locked_content_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upgrade_button_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_share_requests ENABLE ROW LEVEL SECURITY;

-- Service role can do anything (for mobile app tracking)
CREATE POLICY "Service role full access locked_content_views"
  ON public.locked_content_views
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access upgrade_button_clicks"
  ON public.upgrade_button_clicks
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access content_share_requests"
  ON public.content_share_requests
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Restaurant owners can view their own analytics
CREATE POLICY "Restaurant owners can view own locked content views"
  ON public.locked_content_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurants
      WHERE id = restaurant_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant owners can view own upgrade button clicks"
  ON public.upgrade_button_clicks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurants
      WHERE id = restaurant_id
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant owners can view own content share requests"
  ON public.content_share_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurants
      WHERE id = restaurant_id
      AND owner_id = auth.uid()
    )
  );

-- =====================================================
-- Helper Views for Analytics
-- =====================================================

-- Summary view of locked content views by restaurant
CREATE OR REPLACE VIEW public.locked_views_summary AS
SELECT
  restaurant_id,
  restaurant_name,
  tier,
  feature_name,
  COUNT(*) as total_views,
  COUNT(DISTINCT user_id) as unique_users,
  DATE_TRUNC('day', timestamp) as view_date
FROM public.locked_content_views
GROUP BY restaurant_id, restaurant_name, tier, feature_name, DATE_TRUNC('day', timestamp);

-- RLS for view
ALTER VIEW public.locked_views_summary OWNER TO postgres;
GRANT SELECT ON public.locked_views_summary TO authenticated;

-- Summary view of conversion events (upgrade clicks + shares)
CREATE OR REPLACE VIEW public.conversion_events_summary AS
SELECT
  restaurant_id,
  restaurant_name,
  feature_name,
  'upgrade_click' as event_type,
  timestamp
FROM public.upgrade_button_clicks
UNION ALL
SELECT
  restaurant_id,
  restaurant_name,
  feature_name,
  'share_request' as event_type,
  timestamp
FROM public.content_share_requests
ORDER BY timestamp DESC;

-- RLS for view
ALTER VIEW public.conversion_events_summary OWNER TO postgres;
GRANT SELECT ON public.conversion_events_summary TO authenticated;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE public.locked_content_views IS
  'Tracks when users view locked content (tier gating). Used to measure conversion opportunity.';

COMMENT ON TABLE public.upgrade_button_clicks IS
  'Tracks when users click "Upgrade Plan" button in locked content states.';

COMMENT ON TABLE public.content_share_requests IS
  'Tracks when users share requests for restaurants to add content.';

COMMENT ON VIEW public.locked_views_summary IS
  'Daily summary of locked content views by restaurant and feature.';

COMMENT ON VIEW public.conversion_events_summary IS
  'Combined view of all conversion-driving events (upgrade clicks and share requests).';
