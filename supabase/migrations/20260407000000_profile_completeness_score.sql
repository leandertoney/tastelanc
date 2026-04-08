-- Profile Completeness Score
-- Adds a 0-100 score to restaurants that rewards profile completeness with visibility boosts.
-- Priority: deals > video recs > description > menu > happy hours > events > specials > photos > verified > basic info
-- Score is recomputed nightly by pg_cron and can be recalculated on-demand via admin API.

-- ============================================================================
-- Step 1: Add columns to restaurants
-- ============================================================================
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS profile_score SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_score_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.restaurants.profile_score IS
  'Profile completeness score 0-100. Higher scores earn visibility boost in rotation, recommendations, and search. Recomputed nightly.';

-- ============================================================================
-- Step 2: Scoring function — computes score for a single restaurant
-- ============================================================================
CREATE OR REPLACE FUNCTION public.compute_profile_score(p_restaurant_id UUID)
RETURNS SMALLINT AS $$
DECLARE
  score INTEGER := 0;
  v_restaurant RECORD;
  v_count INTEGER;
  v_count2 INTEGER;
BEGIN
  -- Fetch restaurant basics
  SELECT custom_description, cover_image_url, phone, website, price_range, is_verified
  INTO v_restaurant
  FROM public.restaurants WHERE id = p_restaurant_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  -- ── Deals / Coupons (20 pts) ──
  SELECT COUNT(*) INTO v_count
  FROM public.coupons
  WHERE restaurant_id = p_restaurant_id
    AND is_active = true
    AND (end_date IS NULL OR end_date >= CURRENT_DATE);
  IF v_count >= 1 THEN score := score + 15; END IF;
  IF v_count >= 3 THEN score := score + 5; END IF;

  -- ── Video Recommendations (15 pts) ──
  SELECT COUNT(*) INTO v_count
  FROM public.restaurant_recommendations
  WHERE restaurant_id = p_restaurant_id
    AND is_visible = true
    AND is_flagged = false;
  IF v_count >= 1 THEN score := score + 10; END IF;
  IF v_count >= 3 THEN score := score + 5; END IF;

  -- ── Custom Description (10 pts) ──
  IF v_restaurant.custom_description IS NOT NULL
     AND LENGTH(v_restaurant.custom_description) >= 50 THEN
    score := score + 10;
  END IF;

  -- ── Menu Items (15 pts) ──
  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE mi.is_featured = true)
  INTO v_count, v_count2
  FROM public.menu_items mi
  JOIN public.menu_sections ms ON mi.section_id = ms.id
  JOIN public.menus m ON ms.menu_id = m.id
  WHERE m.restaurant_id = p_restaurant_id
    AND m.is_active = true;
  IF v_count >= 5  THEN score := score + 8; END IF;
  IF v_count >= 15 THEN score := score + 4; END IF;
  IF v_count2 >= 1 THEN score := score + 3; END IF;

  -- ── Happy Hours with Items (10 pts) ──
  SELECT COUNT(*) INTO v_count
  FROM public.happy_hours
  WHERE restaurant_id = p_restaurant_id AND is_active = true;
  IF v_count >= 1 THEN
    score := score + 5;
    SELECT COUNT(*) INTO v_count
    FROM public.happy_hour_items hhi
    JOIN public.happy_hours hh ON hhi.happy_hour_id = hh.id
    WHERE hh.restaurant_id = p_restaurant_id AND hh.is_active = true;
    IF v_count >= 1 THEN score := score + 5; END IF;
  END IF;

  -- ── Events (8 pts) ──
  SELECT COUNT(*) INTO v_count
  FROM public.events
  WHERE restaurant_id = p_restaurant_id
    AND is_active = true
    AND (is_recurring = true OR event_date >= CURRENT_DATE);
  IF v_count >= 1 THEN score := score + 5; END IF;
  IF v_count >= 3 THEN score := score + 3; END IF;

  -- ── Specials (6 pts) ──
  SELECT COUNT(*) INTO v_count
  FROM public.specials
  WHERE restaurant_id = p_restaurant_id AND is_active = true;
  IF v_count >= 1 THEN score := score + 4; END IF;
  IF v_count >= 3 THEN score := score + 2; END IF;

  -- ── Photos (8 pts) ──
  IF v_restaurant.cover_image_url IS NOT NULL THEN score := score + 2; END IF;
  SELECT COUNT(*) INTO v_count
  FROM public.restaurant_photos WHERE restaurant_id = p_restaurant_id;
  IF v_count >= 3 THEN score := score + 3; END IF;
  IF v_count >= 6 THEN score := score + 3; END IF;

  -- ── Verified + Hours (5 pts) ──
  IF v_restaurant.is_verified = true THEN score := score + 2; END IF;
  SELECT COUNT(*) INTO v_count
  FROM public.restaurant_hours WHERE restaurant_id = p_restaurant_id;
  IF v_count >= 7 THEN score := score + 3; END IF;

  -- ── Basic Info (3 pts) ──
  IF v_restaurant.phone IS NOT NULL THEN score := score + 1; END IF;
  IF v_restaurant.website IS NOT NULL THEN score := score + 1; END IF;
  IF v_restaurant.price_range IS NOT NULL THEN score := score + 1; END IF;

  RETURN GREATEST(0, LEAST(100, score))::SMALLINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Step 3: Batch refresh function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refresh_all_profile_scores(p_market_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  r RECORD;
  updated_count INTEGER := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.restaurants
    WHERE is_active = true
      AND (p_market_id IS NULL OR market_id = p_market_id)
  LOOP
    UPDATE public.restaurants
    SET profile_score = public.compute_profile_score(r.id),
        profile_score_updated_at = NOW()
    WHERE id = r.id;
    updated_count := updated_count + 1;
  END LOOP;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Step 4: Backfill all existing restaurants
-- ============================================================================
SELECT public.refresh_all_profile_scores();

-- ============================================================================
-- Step 5: Index for sort-by-score queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_restaurants_profile_score
  ON public.restaurants (profile_score DESC) WHERE is_active = true;

-- ============================================================================
-- Step 6: Nightly cron at 2 AM UTC
-- ============================================================================
SELECT cron.schedule(
  'refresh-profile-scores',
  '0 2 * * *',
  $$SELECT public.refresh_all_profile_scores()$$
);

-- ============================================================================
-- Step 7: Permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.compute_profile_score(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_all_profile_scores(UUID) TO service_role;
