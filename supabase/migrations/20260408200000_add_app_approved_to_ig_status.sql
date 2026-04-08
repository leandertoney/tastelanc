-- Add 'app_approved' to the ig_status CHECK constraint on restaurant_recommendations.
-- This value was introduced when app approval was decoupled from Instagram posting,
-- but the constraint was never updated, causing 500 errors on approve actions.

ALTER TABLE restaurant_recommendations
  DROP CONSTRAINT IF EXISTS restaurant_recommendations_ig_status_check;

ALTER TABLE restaurant_recommendations
  ADD CONSTRAINT restaurant_recommendations_ig_status_check
  CHECK (ig_status IN ('pending', 'ai_approved', 'app_approved', 'admin_approved', 'posted', 'rejected'));
