-- Add TikTok traffic source tracking to analytics

-- Add source_tiktok column to analytics_daily_rollups
ALTER TABLE analytics_daily_rollups
ADD COLUMN IF NOT EXISTS source_tiktok INTEGER NOT NULL DEFAULT 0;

-- Drop and recreate rollup_analytics_daily function to include TikTok
DROP FUNCTION IF EXISTS rollup_analytics_daily(DATE, UUID);
CREATE FUNCTION rollup_analytics_daily(target_date DATE, target_market UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete existing rollup for the date/market to avoid duplicates
  DELETE FROM analytics_daily_rollups
  WHERE date = target_date
    AND (target_market IS NULL OR market_id = target_market);

  -- Insert fresh rollup
  INSERT INTO analytics_daily_rollups (
    date,
    market_id,
    total_views,
    unique_visitors,
    total_sessions,
    bounce_rate,
    source_google,
    source_facebook,
    source_instagram,
    source_tiktok,
    source_linktree,
    source_bing,
    source_direct,
    source_email,
    source_other,
    device_desktop,
    device_mobile,
    device_tablet
  )
  SELECT
    target_date,
    pv.market_id,
    COUNT(*)::INTEGER AS total_views,
    COUNT(DISTINCT pv.visitor_id)::INTEGER AS unique_visitors,
    COUNT(DISTINCT pv.session_id)::INTEGER AS total_sessions,
    -- Bounce rate: % of sessions with only 1 view
    ROUND(
      100.0 * COUNT(DISTINCT CASE WHEN session_views.view_count = 1 THEN pv.session_id END)
      / NULLIF(COUNT(DISTINCT pv.session_id), 0)
    , 2) AS bounce_rate,
    COUNT(*) FILTER (WHERE pv.traffic_source = 'google')::INTEGER AS source_google,
    COUNT(*) FILTER (WHERE pv.traffic_source = 'facebook')::INTEGER AS source_facebook,
    COUNT(*) FILTER (WHERE pv.traffic_source = 'instagram')::INTEGER AS source_instagram,
    COUNT(*) FILTER (WHERE pv.traffic_source = 'tiktok')::INTEGER AS source_tiktok,
    COUNT(*) FILTER (WHERE pv.traffic_source = 'linktree')::INTEGER AS source_linktree,
    COUNT(*) FILTER (WHERE pv.traffic_source = 'bing')::INTEGER AS source_bing,
    COUNT(*) FILTER (WHERE pv.traffic_source = 'direct')::INTEGER AS source_direct,
    COUNT(*) FILTER (WHERE pv.traffic_source = 'email')::INTEGER AS source_email,
    COUNT(*) FILTER (WHERE pv.traffic_source = 'other')::INTEGER AS source_other,
    COUNT(*) FILTER (WHERE pv.device_type = 'desktop')::INTEGER AS device_desktop,
    COUNT(*) FILTER (WHERE pv.device_type = 'mobile')::INTEGER AS device_mobile,
    COUNT(*) FILTER (WHERE pv.device_type = 'tablet')::INTEGER AS device_tablet
  FROM
    analytics_page_views pv
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS view_count
    FROM analytics_page_views sub
    WHERE sub.session_id = pv.session_id
      AND DATE(sub.viewed_at) = target_date
      AND (target_market IS NULL OR sub.market_id = target_market)
  ) session_views ON TRUE
  WHERE
    DATE(pv.viewed_at) = target_date
    AND (target_market IS NULL OR pv.market_id = target_market)
  GROUP BY pv.market_id;
END;
$$;
