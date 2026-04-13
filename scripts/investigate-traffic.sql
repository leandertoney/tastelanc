-- TasteLanc Traffic Analytics Investigation
-- Run this to understand why traffic sources aren't showing

-- 1. Check if analytics_page_views has referrer and traffic_source data
SELECT
  'Total page views' as metric,
  COUNT(*) as count
FROM analytics_page_views
UNION ALL
SELECT
  'Page views with referrer' as metric,
  COUNT(*) as count
FROM analytics_page_views
WHERE referrer IS NOT NULL AND referrer != ''
UNION ALL
SELECT
  'Page views with traffic_source' as metric,
  COUNT(*) as count
FROM analytics_page_views
WHERE traffic_source IS NOT NULL
UNION ALL
SELECT
  'Page views with NULL traffic_source' as metric,
  COUNT(*) as count
FROM analytics_page_views
WHERE traffic_source IS NULL;

-- 2. Sample of actual referrer and traffic_source values
SELECT
  referrer,
  traffic_source,
  COUNT(*) as occurrences
FROM analytics_page_views
WHERE referrer IS NOT NULL AND referrer != ''
GROUP BY referrer, traffic_source
ORDER BY occurrences DESC
LIMIT 20;

-- 3. March 23, 2026 spike investigation
SELECT
  DATE(viewed_at) as date,
  EXTRACT(HOUR FROM viewed_at) as hour,
  traffic_source,
  referrer,
  market_id,
  COUNT(*) as views,
  COUNT(DISTINCT visitor_id) as unique_visitors
FROM analytics_page_views
WHERE DATE(viewed_at) = '2026-03-23'
GROUP BY DATE(viewed_at), EXTRACT(HOUR FROM viewed_at), traffic_source, referrer, market_id
ORDER BY hour, views DESC;

-- 4. April 4, 2026 spike investigation
SELECT
  DATE(viewed_at) as date,
  EXTRACT(HOUR FROM viewed_at) as hour,
  traffic_source,
  referrer,
  market_id,
  COUNT(*) as views,
  COUNT(DISTINCT visitor_id) as unique_visitors
FROM analytics_page_views
WHERE DATE(viewed_at) = '2026-04-04'
GROUP BY DATE(viewed_at), EXTRACT(HOUR FROM viewed_at), traffic_source, referrer, market_id
ORDER BY hour, views DESC;

-- 5. Top pages on spike dates
SELECT
  'March 23' as spike_date,
  page_path,
  COUNT(*) as views
FROM analytics_page_views
WHERE DATE(viewed_at) = '2026-03-23'
GROUP BY page_path
ORDER BY views DESC
LIMIT 10
UNION ALL
SELECT
  'April 4' as spike_date,
  page_path,
  COUNT(*) as views
FROM analytics_page_views
WHERE DATE(viewed_at) = '2026-04-04'
GROUP BY page_path
ORDER BY views DESC
LIMIT 10;

-- 6. Check daily rollup data
SELECT
  date,
  market_id,
  total_views,
  unique_visitors,
  source_google,
  source_facebook,
  source_instagram,
  source_linktree,
  source_bing,
  source_direct,
  source_email,
  source_other
FROM analytics_daily_rollups
WHERE date IN ('2026-03-23', '2026-04-04')
ORDER BY date, market_id;

-- 7. Raw top referrers in last 30 days
SELECT
  referrer,
  COUNT(*) as count,
  COUNT(DISTINCT visitor_id) as unique_visitors
FROM analytics_page_views
WHERE viewed_at >= CURRENT_DATE - INTERVAL '30 days'
  AND referrer IS NOT NULL
  AND referrer != ''
GROUP BY referrer
ORDER BY count DESC
LIMIT 30;

-- 8. Traffic by market in last 30 days
SELECT
  m.name as market_name,
  COUNT(*) as total_views,
  COUNT(DISTINCT apv.visitor_id) as unique_visitors
FROM analytics_page_views apv
LEFT JOIN markets m ON apv.market_id = m.id
WHERE viewed_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY m.name
ORDER BY total_views DESC;

-- 9. Check if PageViewTracker is capturing referrer
SELECT
  DATE(viewed_at) as date,
  COUNT(*) as total_views,
  COUNT(CASE WHEN referrer IS NOT NULL AND referrer != '' THEN 1 END) as views_with_referrer,
  ROUND(100.0 * COUNT(CASE WHEN referrer IS NOT NULL AND referrer != '' THEN 1 END) / COUNT(*), 2) as referrer_capture_rate
FROM analytics_page_views
WHERE viewed_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(viewed_at)
ORDER BY date DESC;
