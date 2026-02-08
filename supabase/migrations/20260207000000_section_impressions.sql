-- Section Impressions Tracking
-- Tracks when restaurants appear on-screen in home sections, View All screens, etc.
-- Powers the fair visibility dashboard and sales tool.

-- =====================================================
-- Section Impressions Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.section_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL, -- 'happy_hours', 'entertainment', 'events', 'featured', 'other_places', 'search', 'category', 'specials_view_all', 'happy_hours_view_all'
  position_index SMALLINT NOT NULL, -- 0-based position in the list/carousel
  visitor_id TEXT NOT NULL, -- user ID or 'anonymous'
  epoch_seed BIGINT NOT NULL, -- the 30-min rotation epoch for deduplication
  impressed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite unique constraint for deduplication:
-- Same restaurant + section + visitor + epoch = 1 impression
CREATE UNIQUE INDEX IF NOT EXISTS idx_section_impressions_dedup
  ON public.section_impressions(restaurant_id, section_name, visitor_id, epoch_seed);

-- Index for restaurant owner dashboard queries (their restaurant, recent)
CREATE INDEX IF NOT EXISTS idx_section_impressions_restaurant_time
  ON public.section_impressions(restaurant_id, impressed_at DESC);

-- Index for admin dashboard: aggregate by section
CREATE INDEX IF NOT EXISTS idx_section_impressions_section_time
  ON public.section_impressions(section_name, impressed_at DESC);

-- Note: Daily rollup queries use idx_section_impressions_restaurant_time
-- which covers (restaurant_id, impressed_at DESC) efficiently.

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE public.section_impressions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (fire-and-forget from mobile app)
CREATE POLICY "Anyone can insert impressions"
  ON public.section_impressions
  FOR INSERT
  WITH CHECK (true);

-- Service role has full access (for admin queries)
CREATE POLICY "Service role full access section_impressions"
  ON public.section_impressions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Restaurant owners can view their own impressions
CREATE POLICY "Restaurant owners can view own impressions"
  ON public.section_impressions
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
-- Aggregation Views
-- =====================================================

-- Daily rollup by restaurant and section
CREATE OR REPLACE VIEW public.section_impression_summary AS
SELECT
  restaurant_id,
  section_name,
  DATE(impressed_at) AS impression_date,
  COUNT(*) AS total_impressions,
  COUNT(DISTINCT visitor_id) AS unique_viewers,
  ROUND(AVG(position_index), 1) AS avg_position
FROM public.section_impressions
GROUP BY restaurant_id, section_name, DATE(impressed_at);

ALTER VIEW public.section_impression_summary OWNER TO postgres;
GRANT SELECT ON public.section_impression_summary TO authenticated;

-- Rolling 7-day per-restaurant summary (with CTR from analytics_clicks)
CREATE OR REPLACE VIEW public.restaurant_visibility_7d AS
SELECT
  si.restaurant_id,
  r.name AS restaurant_name,
  COALESCE(t.name, 'basic') AS tier_name,
  COUNT(*) AS total_impressions,
  COUNT(DISTINCT si.visitor_id) AS unique_viewers,
  ROUND(AVG(si.position_index), 1) AS avg_position,
  COALESCE(clicks.click_count, 0) AS total_clicks,
  CASE
    WHEN COUNT(*) > 0
    THEN ROUND((COALESCE(clicks.click_count, 0)::NUMERIC / COUNT(*)) * 100, 1)
    ELSE 0
  END AS ctr_percent
FROM public.section_impressions si
JOIN public.restaurants r ON r.id = si.restaurant_id
LEFT JOIN public.tiers t ON t.id = r.tier_id
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS click_count
  FROM public.analytics_clicks ac
  WHERE ac.restaurant_id = si.restaurant_id
  AND ac.clicked_at >= NOW() - INTERVAL '7 days'
) clicks ON true
WHERE si.impressed_at >= NOW() - INTERVAL '7 days'
GROUP BY si.restaurant_id, r.name, t.name, clicks.click_count;

ALTER VIEW public.restaurant_visibility_7d OWNER TO postgres;
GRANT SELECT ON public.restaurant_visibility_7d TO authenticated;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE public.section_impressions IS
  'Tracks when restaurants appear on-screen in app sections. Deduped per restaurant+section+visitor per 30-min epoch.';

COMMENT ON VIEW public.section_impression_summary IS
  'Daily rollup of section impressions by restaurant and section name.';

COMMENT ON VIEW public.restaurant_visibility_7d IS
  'Rolling 7-day visibility summary per restaurant with CTR. Powers the owner dashboard and admin fairness tools.';
