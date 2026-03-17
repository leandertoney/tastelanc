-- Web Traffic Analytics: new columns, rollup tables, indexes, RPC, and RLS
-- Adds traffic source attribution, session tracking, UTM params, device/browser parsing

-- ============================================================
-- 1. Add columns to analytics_page_views
-- ============================================================
ALTER TABLE analytics_page_views ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE analytics_page_views ADD COLUMN IF NOT EXISTS traffic_source TEXT;
ALTER TABLE analytics_page_views ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE analytics_page_views ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE analytics_page_views ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE analytics_page_views ADD COLUMN IF NOT EXISTS is_landing BOOLEAN DEFAULT false;
ALTER TABLE analytics_page_views ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE analytics_page_views ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE analytics_page_views ADD COLUMN IF NOT EXISTS market_id UUID REFERENCES markets(id);

-- ============================================================
-- 2. Create analytics_daily_rollups table
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_daily_rollups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  market_id UUID REFERENCES markets(id),
  total_views INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  source_direct INTEGER NOT NULL DEFAULT 0,
  source_google INTEGER NOT NULL DEFAULT 0,
  source_facebook INTEGER NOT NULL DEFAULT 0,
  source_instagram INTEGER NOT NULL DEFAULT 0,
  source_linktree INTEGER NOT NULL DEFAULT 0,
  source_bing INTEGER NOT NULL DEFAULT 0,
  source_email INTEGER NOT NULL DEFAULT 0,
  source_other INTEGER NOT NULL DEFAULT 0,
  device_desktop INTEGER NOT NULL DEFAULT 0,
  device_mobile INTEGER NOT NULL DEFAULT 0,
  device_tablet INTEGER NOT NULL DEFAULT 0,
  single_page_sessions INTEGER NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, market_id)
);

-- ============================================================
-- 3. Create analytics_top_pages_daily table
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_top_pages_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  market_id UUID REFERENCES markets(id),
  page_path TEXT NOT NULL,
  page_type TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  unique_visitor_count INTEGER NOT NULL DEFAULT 0,
  landing_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(date, market_id, page_path)
);

-- ============================================================
-- 4. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_apv_market_viewed ON analytics_page_views(market_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_apv_session ON analytics_page_views(session_id, viewed_at);
CREATE INDEX IF NOT EXISTS idx_apv_source_market ON analytics_page_views(market_id, traffic_source, viewed_at DESC);
-- Note: partial index with NOW() not possible (not immutable).
-- The idx_apv_market_viewed index handles recent queries efficiently.
CREATE INDEX IF NOT EXISTS idx_rollups_date_market ON analytics_daily_rollups(date DESC, market_id);
CREATE INDEX IF NOT EXISTS idx_top_pages_date_market ON analytics_top_pages_daily(date DESC, market_id);

-- ============================================================
-- 5. RPC: rollup_analytics_daily
-- Recomputes rollup for a given date (and optionally a specific market).
-- Called by API on dashboard load (for today) and by nightly cron (for yesterday).
-- ============================================================
CREATE OR REPLACE FUNCTION rollup_analytics_daily(target_date DATE, target_market UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Upsert daily rollups
  INSERT INTO analytics_daily_rollups (
    date, market_id,
    total_views, unique_visitors, total_sessions,
    source_direct, source_google, source_facebook, source_instagram,
    source_linktree, source_bing, source_email, source_other,
    device_desktop, device_mobile, device_tablet,
    single_page_sessions, total_clicks, computed_at
  )
  SELECT
    target_date,
    pv.market_id,
    COUNT(*)::INTEGER,
    COUNT(DISTINCT pv.visitor_id)::INTEGER,
    COUNT(DISTINCT pv.session_id)::INTEGER,
    COUNT(*) FILTER (WHERE pv.traffic_source = 'direct')::INTEGER,
    COUNT(*) FILTER (WHERE pv.traffic_source = 'google')::INTEGER,
    COUNT(*) FILTER (WHERE pv.traffic_source = 'facebook')::INTEGER,
    COUNT(*) FILTER (WHERE pv.traffic_source = 'instagram')::INTEGER,
    COUNT(*) FILTER (WHERE pv.traffic_source = 'linktree')::INTEGER,
    COUNT(*) FILTER (WHERE pv.traffic_source = 'bing')::INTEGER,
    COUNT(*) FILTER (WHERE pv.traffic_source = 'email')::INTEGER,
    COUNT(*) FILTER (WHERE pv.traffic_source = 'other')::INTEGER,
    COUNT(*) FILTER (WHERE pv.device_type = 'desktop')::INTEGER,
    COUNT(*) FILTER (WHERE pv.device_type = 'mobile')::INTEGER,
    COUNT(*) FILTER (WHERE pv.device_type = 'tablet')::INTEGER,
    -- Bounce: sessions with only 1 page view
    (SELECT COUNT(*)::INTEGER FROM (
      SELECT session_id FROM analytics_page_views
      WHERE DATE(viewed_at) = target_date
        AND (target_market IS NULL OR market_id = target_market)
        AND session_id IS NOT NULL
      GROUP BY session_id
      HAVING COUNT(*) = 1
    ) bounce_sessions),
    -- Clicks from analytics_clicks for this date
    (SELECT COUNT(*)::INTEGER FROM analytics_clicks
     WHERE DATE(clicked_at) = target_date),
    NOW()
  FROM analytics_page_views pv
  WHERE DATE(pv.viewed_at) = target_date
    AND (target_market IS NULL OR pv.market_id = target_market)
  GROUP BY pv.market_id
  ON CONFLICT (date, market_id) DO UPDATE SET
    total_views = EXCLUDED.total_views,
    unique_visitors = EXCLUDED.unique_visitors,
    total_sessions = EXCLUDED.total_sessions,
    source_direct = EXCLUDED.source_direct,
    source_google = EXCLUDED.source_google,
    source_facebook = EXCLUDED.source_facebook,
    source_instagram = EXCLUDED.source_instagram,
    source_linktree = EXCLUDED.source_linktree,
    source_bing = EXCLUDED.source_bing,
    source_email = EXCLUDED.source_email,
    source_other = EXCLUDED.source_other,
    device_desktop = EXCLUDED.device_desktop,
    device_mobile = EXCLUDED.device_mobile,
    device_tablet = EXCLUDED.device_tablet,
    single_page_sessions = EXCLUDED.single_page_sessions,
    total_clicks = EXCLUDED.total_clicks,
    computed_at = NOW();

  -- Upsert top pages daily
  INSERT INTO analytics_top_pages_daily (
    date, market_id, page_path, page_type,
    view_count, unique_visitor_count, landing_count
  )
  SELECT
    target_date,
    pv.market_id,
    pv.page_path,
    pv.page_type,
    COUNT(*)::INTEGER,
    COUNT(DISTINCT pv.visitor_id)::INTEGER,
    COUNT(*) FILTER (WHERE pv.is_landing = true)::INTEGER
  FROM analytics_page_views pv
  WHERE DATE(pv.viewed_at) = target_date
    AND (target_market IS NULL OR pv.market_id = target_market)
  GROUP BY pv.market_id, pv.page_path, pv.page_type
  ON CONFLICT (date, market_id, page_path) DO UPDATE SET
    page_type = EXCLUDED.page_type,
    view_count = EXCLUDED.view_count,
    unique_visitor_count = EXCLUDED.unique_visitor_count,
    landing_count = EXCLUDED.landing_count;
END;
$$;

-- ============================================================
-- 6. RLS policies
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE analytics_daily_rollups ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_top_pages_daily ENABLE ROW LEVEL SECURITY;

-- Admins can read rollups
CREATE POLICY "Admins can read daily rollups"
  ON analytics_daily_rollups
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'co_founder', 'market_admin')
    )
  );

-- Admins can read top pages
CREATE POLICY "Admins can read top pages daily"
  ON analytics_top_pages_daily
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'co_founder', 'market_admin')
    )
  );
