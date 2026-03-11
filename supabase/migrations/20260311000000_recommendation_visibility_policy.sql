-- Update SELECT policy: users can see visible recs + their own pending recs
-- This supports the new review-before-visible flow where recs start as is_visible=false

DROP POLICY IF EXISTS "Anyone can read visible recommendations" ON restaurant_recommendations;

CREATE POLICY "Read visible recs or own recs"
  ON restaurant_recommendations FOR SELECT
  USING (is_visible = TRUE OR auth.uid() = user_id);
