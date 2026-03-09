-- Pulse Feed: public read access for community data
-- 1. Allow anyone to read votes (they're already public on the leaderboard via RPC)
-- 2. Add a SECURITY DEFINER function to return restaurant buzz (check-in counts)
--    without exposing individual checkin rows (which are user-scoped by RLS)

-- 1. Public read access for votes
CREATE POLICY "Public can read votes"
  ON public.votes FOR SELECT
  USING (true);

-- 2. Restaurant buzz function — returns restaurants that were recently busy
--    based on check-in counts, aggregated (no individual user data exposed)
CREATE OR REPLACE FUNCTION public.get_restaurant_buzz(p_market_id UUID)
RETURNS TABLE (
  restaurant_id UUID,
  restaurant_name TEXT,
  cover_image_url TEXT,
  checkin_count_7d BIGINT,
  checkin_count_this_week BIGINT,
  last_checkin_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    r.id AS restaurant_id,
    r.name AS restaurant_name,
    r.cover_image_url,
    COUNT(c.id) FILTER (WHERE c.created_at >= now() - interval '7 days') AS checkin_count_7d,
    COUNT(c.id) FILTER (WHERE c.created_at >= date_trunc('week', now())) AS checkin_count_this_week,
    MAX(c.created_at) AS last_checkin_at
  FROM restaurants r
  JOIN checkins c ON c.restaurant_id = r.id
  WHERE r.market_id = p_market_id
    AND r.is_active = TRUE
    AND c.created_at >= now() - interval '14 days'
  GROUP BY r.id, r.name, r.cover_image_url
  HAVING COUNT(c.id) FILTER (WHERE c.created_at >= now() - interval '7 days') >= 1
  ORDER BY checkin_count_7d DESC
  LIMIT 20;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_restaurant_buzz(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_restaurant_buzz(UUID) TO authenticated;
