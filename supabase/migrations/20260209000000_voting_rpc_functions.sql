-- =============================================
-- VOTING SYSTEM REWORK
-- =============================================
-- Move voting from client-side AsyncStorage to Supabase.
-- Add RPC functions for cross-user leaderboard aggregation.
-- Use existing `visits` table for vote eligibility.
-- =============================================

-- =============================================
-- VISITS TABLE (for tracking restaurant visits)
-- =============================================
-- Used by mobile app for personalization and voting eligibility.

CREATE TABLE IF NOT EXISTS public.visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'radar',
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Users can manage their own visits
CREATE POLICY "Users can manage own visits" ON public.visits
  FOR ALL USING (auth.uid() = user_id);

-- Service role full access for backend operations
CREATE POLICY "Service role full access visits" ON public.visits
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Indexes for visit queries
CREATE INDEX IF NOT EXISTS idx_visits_user_restaurant ON public.visits(user_id, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_visits_user_visited_at ON public.visits(user_id, visited_at);

-- Indexes for efficient voting queries
CREATE INDEX IF NOT EXISTS idx_votes_month ON public.votes(month);
CREATE INDEX IF NOT EXISTS idx_votes_category_month ON public.votes(category, month);
CREATE INDEX IF NOT EXISTS idx_votes_user_month ON public.votes(user_id, month);

-- =============================================
-- get_category_leaderboard
-- =============================================
-- Aggregates votes across ALL users for a given category/month.
-- SECURITY DEFINER because RLS restricts users to their own votes.
-- Tiebreaker: restaurant that received its first vote earliest wins.

CREATE OR REPLACE FUNCTION public.get_category_leaderboard(
  p_category TEXT,
  p_month TEXT
)
RETURNS TABLE (
  restaurant_id UUID,
  vote_count BIGINT,
  tier TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT
      v.restaurant_id,
      COUNT(*) AS vote_count,
      ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, MIN(v.created_at) ASC) AS rank
    FROM public.votes v
    WHERE v.category = p_category
      AND v.month = p_month
    GROUP BY v.restaurant_id
  )
  SELECT
    ranked.restaurant_id,
    ranked.vote_count,
    CASE
      WHEN ranked.rank = 1 THEN 'top_pick'
      WHEN ranked.rank = 2 THEN 'leading_pick'
      WHEN ranked.rank = 3 THEN 'local_favorite'
      ELSE 'on_the_board'
    END::TEXT AS tier
  FROM ranked
  ORDER BY ranked.rank ASC;
END;
$$;

-- =============================================
-- get_current_winners
-- =============================================
-- Returns the top pick (rank 1) for every category in a given month.

CREATE OR REPLACE FUNCTION public.get_current_winners(
  p_month TEXT
)
RETURNS TABLE (
  restaurant_id UUID,
  category TEXT,
  vote_count BIGINT,
  tier TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT
      v.restaurant_id,
      v.category,
      COUNT(*) AS vote_count,
      ROW_NUMBER() OVER (
        PARTITION BY v.category
        ORDER BY COUNT(*) DESC, MIN(v.created_at) ASC
      ) AS rank
    FROM public.votes v
    WHERE v.month = p_month
    GROUP BY v.restaurant_id, v.category
  )
  SELECT
    ranked.restaurant_id,
    ranked.category,
    ranked.vote_count,
    'top_pick'::TEXT AS tier
  FROM ranked
  WHERE ranked.rank = 1;
END;
$$;

-- =============================================
-- check_voting_eligibility
-- =============================================
-- Returns which of the given restaurant IDs the user has visited this month.
-- SECURITY DEFINER to access visits table regardless of RLS.

CREATE OR REPLACE FUNCTION public.check_voting_eligibility(
  p_user_id UUID,
  p_restaurant_ids UUID[]
)
RETURNS TABLE (restaurant_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  month_start TIMESTAMPTZ;
BEGIN
  month_start := date_trunc('month', NOW());

  RETURN QUERY
  SELECT DISTINCT v.restaurant_id
  FROM public.visits v
  WHERE v.user_id = p_user_id
    AND v.restaurant_id = ANY(p_restaurant_ids)
    AND v.visited_at >= month_start;
END;
$$;
